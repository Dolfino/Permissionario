const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const filePath = path.join(__dirname, 'showroom.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/showroom.html') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro ao ler showroom.html: ' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CEOP Showroom rodando em: http://localhost:${PORT}/`);
});
