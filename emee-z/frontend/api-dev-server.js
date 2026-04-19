// Dev server for local API testing (using built-in http module)
const http = require('http');
const url = require('url');
const handler = require('./api/index.js');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Collect request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // Parse JSON body if content-type is application/json
      let parsedBody = {};
      if (body && req.headers['content-type']?.includes('application/json')) {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Create response object with json method
      res.json = function(data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };

      res.status = function(code) {
        res.statusCode = code;
        return res;
      };

      // Call the handler
      const vercelReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: parsedBody,
        query: parsedUrl.query
      };

      await handler(vercelReq, res);
    } catch (err) {
      console.error('API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✓ API dev server listening on http://localhost:${PORT}`);
});
