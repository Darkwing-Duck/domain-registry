import http from 'http';
import { routeRequest } from './router.js';

const server = http.createServer((req, res) => {
  routeRequest(req, res).then(() => {
    console.log(`Request received: ${req.method} ${req.url}`);
  }).catch((error) => {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error\n');
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
});
