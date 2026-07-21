const http = require('http');
const zlib = require('zlib');

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Encoding': 'gzip',
    'Content-Type': 'text/plain'
  });
  
  const gzip = zlib.createGzip();
  gzip.pipe(res);
  
  // write 100MB of zeros
  const buf = Buffer.alloc(1024 * 1024 * 100, '0');
  gzip.write(buf);
  gzip.end();
});

server.listen(3000, async () => {
  console.log('Server listening on 3000');
  
  try {
    const resp = await fetch('http://localhost:3000');
    let size = 0;
    if (resp.body) {
        for await (const chunk of resp.body) {
            size += chunk.length;
            console.log('got chunk', chunk.length);
        }
    } else {
        const text = await resp.text();
        size = text.length;
    }
    console.log('done, total size:', size);
  } catch (err) {
    console.error('Fetch error:', err);
  }
  
  server.close();
});
