const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const getCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const createDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const generateAndSaveCode = () => {
  const dirPath = path.join(__dirname, '/code');
  createDirectory(dirPath);
  const code = getCode().toString();
  const filePath = path.join(dirPath, 'dailyCode.txt');
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Código generado: ${code}`);
}

cron.schedule('0 10 * * *', generateAndSaveCode);

const getCodeFromFile = () => {
  try {
    const filePath = path.join(__dirname, '/code', 'dailyCode.txt');
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('No se pudo leer el código del archivo', err);
    return null;
  }
}

module.exports = { getCodeFromFile }
