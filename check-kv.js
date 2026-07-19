const { Redis } = require('@upstash/redis');
const fs = require('fs');
const env = fs.readFileSync('.env.development.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN,
});

async function main() {
  const keys = await redis.keys('workspace_image:*');
  console.log('Image keys found:', keys);
  if (keys.length > 0) {
    const val = await redis.get(keys[0]);
    console.log('Value type:', typeof val);
    console.log('Length of base64:', val ? val.length : 0);
    console.log('Starts with:', val ? val.substring(0, 50) : null);
  }
}
main().catch(console.error);
