const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const getCode = () => {
  return Math.floor(1000 + Math.random() * 9000);
}

const generateAndSaveCode = () => {
  const code = getCode();
  fs.writeFileSync(path.join("src/code", 'dailyCode.txt'), code);
}

cron.schedule('0 10 * * *', generateAndSaveCode);

const getCodeFromFile = () => {
  try {
    return fs.readFileSync(path.join("src/code", 'dailyCode.txt'), 'utf8');
  } catch (err) {
    console.error('No se pudo leer el código del archivo', err);
    return null;
  }
}

module.exports = { getCodeFromFile }