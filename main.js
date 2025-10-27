const { Command } = require('commander');
const fs = require('fs');
const http = require('http');
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();
const xmlBuilder = new XMLBuilder({
  format: true,
  suppressEmptyNode: false,
  ignoreAttributes: false
});

program
  .requiredOption('-i, --input <path>', 'шлях до файлу для читання')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .parse(process.argv);

const options = program.opts();

console.log('Отримані параметри:', options);

if (!fs.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

// Асинхронне читання JSON файлу
async function readJsonFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Помилка читання файлу:', error.message);
    return null;
  }
}

// Функція для фільтрації та форматування даних банків
function processBankData(bankData, queryParams) {
  let filteredData = bankData;

  // Фільтрація: ?normal=true - лише банки з COD_STATE = "1" (Нормальний)
  if (queryParams.normal === 'true') {
    filteredData = filteredData.filter(bank => bank.COD_STATE === 1);
  }

  // Форматування результату
  const banks = filteredData.map(bank => {
    const bankObj = {};

    // Відображення MFO коду: ?mfo=true
    if (queryParams.mfo === 'true') {
      bankObj.mfo_code = bank.MFO;
    }

    // Назва банку - використовуємо SHORTNAME
    bankObj.name = bank.SHORTNAME;

    // Відображення стану: завжди для нормального режиму
    if (queryParams.normal === 'true') {
      bankObj.state_code = bank.COD_STATE;
    }

    return bankObj;
  });

  return { banks: { bank: banks } };
}

const server = http.createServer(async (req, res) => {
  console.log(`Запит: ${req.method} ${req.url}`);

  try {
    // Парсинг URL параметрів
    const url = new URL(req.url, `http://${options.host}:${options.port}`);
    const queryParams = Object.fromEntries(url.searchParams);

    console.log('Query параметри:', queryParams);

    // Читання JSON файлу
    const bankData = await readJsonFile(options.input);
    if (!bankData) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Помилка читання даних');
      return;
    }

    // Дебаг інформація
    console.log('Кількість банків у файлі:', bankData.length);
    if (bankData.length > 0) {
      console.log('Приклад банку:', {
        MFO: bankData[0].MFO,
        SHORTNAME: bankData[0].SHORTNAME,
        COD_STATE: bankData[0].COD_STATE
      });
    }

    // Обробка даних
    const processedData = processBankData(bankData, queryParams);

    // Конвертація в XML
    const xmlData = xmlBuilder.build(processedData);

    // Відправка відповіді
    res.writeHead(200, { 
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlData);

    console.log('Відправлено XML відповідь');

  } catch (error) {
    console.error('Помилка обробки запиту:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`=== Сервер запущено на http://${options.host}:${options.port} ===`);
  console.log(`=== Файл даних: ${options.input} ===`);
  console.log(`=== Частина 2: XML відповіді активні ===`);
  console.log(`=== Доступні параметри: ===`);
  console.log(`===   ?mfo=true - показати коди МФО ===`);
  console.log(`===   ?normal=true - тільки банки з COD_STATE=1 ===`);
  console.log(`===   ?mfo=true&normal=true - обидва параметри ===`);
});