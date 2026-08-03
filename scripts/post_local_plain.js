const http = require('http');
const data = JSON.stringify({ url: 'https://google-drive-sharefiles.net' });
const opts = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/analyze-url',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = http.request(opts, (res) => {
  let raw = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => raw += chunk);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log('body:');
    console.log(raw);
  });
});
req.on('error', (e) => console.error('request error', e.message));
req.write(data);
req.end();
