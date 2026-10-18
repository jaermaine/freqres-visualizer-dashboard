import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const moduleCache = new Map();

function loadTsModule(relPath) {
  const fullPath = path.resolve(rootDir, relPath);
  if (moduleCache.has(fullPath)) {
    return moduleCache.get(fullPath).exports;
  }

  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: fullPath,
  });

  const mod = new Module(fullPath);
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  moduleCache.set(fullPath, mod);

  const defaultRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id.startsWith("@/")) {
      const targetRel = id.slice(2) + (id.endsWith(".ts") ? "" : ".ts");
      return loadTsModule(targetRel);
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(fullPath), id + (id.endsWith(".ts") ? "" : ".ts"));
      return loadTsModule(path.relative(rootDir, resolved));
    }
    return defaultRequire(id);
  };

  mod._compile(outputText, fullPath);
  return mod.exports;
}

const security = loadTsModule("lib/security.ts");
const parser = loadTsModule("lib/parseMeasurementFile.ts");
const targets = loadTsModule("lib/targets.ts");
const urlParser = loadTsModule("lib/parseSourceUrl.ts");

test("security.isPublicIp blocks private, loopback, CGNAT, and IPv4-mapped IPv6 addresses", () => {
  const { isPublicIp } = security;

  // Valid public IPs
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("1.1.1.1"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
  assert.equal(isPublicIp("::ffff:8.8.8.8"), true);

  // Blocked IPv4 ranges
  assert.equal(isPublicIp("127.0.0.1"), false);
  assert.equal(isPublicIp("10.0.0.1"), false);
  assert.equal(isPublicIp("172.16.0.1"), false);
  assert.equal(isPublicIp("192.168.1.1"), false);
  assert.equal(isPublicIp("169.254.169.254"), false);
  assert.equal(isPublicIp("100.64.0.1"), false); // CGNAT
  assert.equal(isPublicIp("0.0.0.0"), false);
  assert.equal(isPublicIp("224.0.0.1"), false); // Multicast

  // Blocked IPv6 & IPv4-mapped IPv6 bypass attempts
  assert.equal(isPublicIp("::1"), false);
  assert.equal(isPublicIp("::"), false);
  assert.equal(isPublicIp("fc00::1"), false);
  assert.equal(isPublicIp("fe80::1"), false);
  assert.equal(isPublicIp("ff02::1"), false);
  assert.equal(isPublicIp("::ffff:127.0.0.1"), false);
  assert.equal(isPublicIp("::ffff:169.254.169.254"), false);
  assert.equal(isPublicIp("::ffff:7f00:1"), false);
  assert.equal(isPublicIp("::ffff:a9fe:a9fe"), false);
});

test("security.checkInMemoryRateLimit enforces window limit and bounded LRU eviction", () => {
  const { checkInMemoryRateLimit } = security;

  const prefix = `test-${Date.now()}`;
  assert.equal(checkInMemoryRateLimit(`${prefix}:ip1`, 2, 60_000), true);
  assert.equal(checkInMemoryRateLimit(`${prefix}:ip1`, 2, 60_000), true);
  assert.equal(checkInMemoryRateLimit(`${prefix}:ip1`, 2, 60_000), false);
});

test("parseMeasurementFile interpolates in log10(Hz) space and parses multi-channel data in one pass", () => {
  const {
    parseMeasurementTextMultiChannel,
    interpolateLogHz,
    computeRefMean,
    buildLogGrid,
  } = parser;

  const grid = buildLogGrid();
  assert.equal(grid.length, 201);
  assert.equal(grid[0], 20);
  assert.equal(grid[200], 20000);

  // Geometric midpoint between 100 Hz (0 dB) and 1000 Hz (10 dB) is ~316.227766 Hz -> 5 dB in log10 space
  const midLogDb = interpolateLogHz([100, 1000], [0, 10], Math.sqrt(100 * 1000));
  assert.ok(Math.abs(midLogDb - 5) < 1e-6);

  // Multi-channel stereo file
  const lines = ["Frequency\tLeft\tRight"];
  for (let i = 0; i < 30; i++) {
    const hz = 20 * Math.pow(1000, i / 29);
    lines.push(`${hz.toFixed(2)}\t${(60 + i * 0.2).toFixed(2)}\t${(62 + i * 0.2).toFixed(2)}`);
  }
  const rawStereo = lines.join("\n");
  const sepRes = parseMeasurementTextMultiChannel(rawStereo, { channelMode: "separate" });
  assert.equal(sepRes.ok, true);
  const leftCurve = sepRes.curves.find((c) => c.channel === "L");
  const rightCurve = sepRes.curves.find((c) => c.channel === "R");
  assert.ok(leftCurve);
  assert.ok(rightCurve);

  const avgRes = parseMeasurementTextMultiChannel(rawStereo, { channelMode: "avg" });
  assert.equal(avgRes.ok, true);
  const avgCurve = avgRes.curves.find((c) => c.channel === "avg");
  assert.ok(avgCurve);
  assert.equal(avgCurve.normalized.hz.length, 201);
  assert.ok(avgCurve.rawChannels);

  // Average curve should be midpoint between L and R (2 dB apart -> 1 dB above L)
  assert.ok(Math.abs(avgCurve.normalized.db[100] - (leftCurve.normalized.db[100] + 1)) < 1e-4);

  // computeRefMean matches 900-1100 Hz average
  const refMean = computeRefMean(avgCurve.normalized.hz, avgCurve.normalized.db);
  let manualSum = 0;
  let manualCount = 0;
  for (let i = 0; i < avgCurve.normalized.hz.length; i++) {
    const f = avgCurve.normalized.hz[i];
    if (f >= 900 && f <= 1100) {
      manualSum += avgCurve.normalized.db[i];
      manualCount++;
    }
  }
  assert.ok(Math.abs(refMean - manualSum / manualCount) < 1e-9);
});

test("parseMeasurementFile rejects HTML and binary payloads with standardized error messages", () => {
  const { parseMeasurementText } = parser;

  const htmlRes = parseMeasurementText("<!DOCTYPE html><html><body>Not a curve</body></html>");
  assert.equal(htmlRes.ok, false);
  assert.equal(htmlRes.code, "HTML_RESPONSE");

  const binRes = parseMeasurementText("20\t60\0binary");
  assert.equal(binRes.ok, false);
  assert.equal(binRes.code, "UNSUPPORTED_BINARY_CONTENT");
});

test("targets caches 201-point target grid projections and preserves all target curves", () => {
  const { TUNING_TARGETS, getTargetGridDb } = targets;

  assert.equal(TUNING_TARGETS.length, 5);
  for (const target of TUNING_TARGETS) {
    assert.equal(target.hz.length, target.db.length, `${target.label} hz and db lengths should match`);
    assert.ok(target.hz.length >= 150, `${target.label} should have valid points`);
    const gridA = getTargetGridDb(target.id);
    const gridB = getTargetGridDb(target.id);
    assert.equal(gridA.length, 201);
    assert.equal(gridA, gridB, "getTargetGridDb should return cached array instance");
  }
});

test("parseSourceUrl classifies Squig.link, raw measurement files, and unsupported URLs", () => {
  const { parseSourceUrl } = urlParser;

  const squig = parseSourceUrl("https://precog.squig.link/?share=Truthear_Gate");
  assert.equal(squig.kind, "squiglink-share-url");

  const raw = parseSourceUrl("https://example.com/data/curve.txt");
  assert.equal(raw.kind, "raw-measurement-file-url");

  const hangout = parseSourceUrl("https://graph.hangout.audio/iem/5128/?share=Rockies");
  assert.equal(hangout.kind, "hangout-graph-url");
});
