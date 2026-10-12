// Servidor estático mínimo, para abrir a página localmente e para os testes.
// Os módulos JavaScript não carregam a partir de file://; por isso o servidor.
// Uso: node ferramentas/servidor.mjs [porta]   (padrão: 8000)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

/** Sobe o servidor e devolve-o já escutando. Porta 0 escolhe uma livre. */
export function servir(porta = 8000) {
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let caminho = path.normalize(path.join(RAIZ, decodeURIComponent(url.pathname)));
    if (!caminho.startsWith(RAIZ)) {
      res.writeHead(403).end();
      return;
    }
    if (url.pathname.endsWith('/')) caminho = path.join(caminho, 'index.html');
    try {
      const corpo = await readFile(caminho);
      res.writeHead(200, { 'content-type': TIPOS[path.extname(caminho)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(corpo);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('não encontrado');
    }
  });
  return new Promise((resolve) => servidor.listen(porta, '127.0.0.1', () => resolve(servidor)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const porta = Number(process.argv[2] ?? 8000);
  const s = await servir(porta);
  console.log(`Servindo ${RAIZ} em http://localhost:${s.address().port}/`);
}
