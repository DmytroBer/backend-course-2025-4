const { Command } = require('commander');
const fs = require('fs');
const http = require('http');

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'шлях до файлу')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .parse(process.argv);

const options = program.opts();

// Додайте ці console.log для дебагу
console.log('Отримані параметри:', options);

if (!fs.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  console.log(`Запит: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Сервер працює!\n');
});

server.listen(options.port, options.host, () => {
  console.log(`=== Сервер запущено на http://${options.host}:${options.port} ===`);
  console.log(`=== Файл даних: ${options.input} ===`);
});