const fs = require("fs");
const path = require("path");
const { logMessage } = require("./logger");

// const loginDir = path.join(__dirname, 'logs');
// if (!fs.existsSync(loginDir)) {
//     fs.mkdirSync(loginDir);
// }
// setInterval(() => {
//     const file = path.join(loginDir, 'logs.txt');
//     const type = Math.random() > 0.5 ? 'success' : 'error';
//     const message = type === 'success' ? 'Everything is ok ' : 'Error ';
//     logMessage(file, message, type);
//     console.log('Added ${type} log')
// }, 10000);

const baseDir = path.join(__dirname, "logs");
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

let currentFolder = path.join(baseDir, getFolderName());
createFolder();

function getFolderName() {
  const now = new Date();
  return `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}_${now.getHours()}-${now.getMinutes()}`;
}

function createFolder() {
  try {
    currentFolder = path.join(baseDir, getFolderName());
    fs.mkdirSync(currentFolder, { recursive: true });
    console.log("New folder successfully create", currentFolder);
  } catch (e) {
    console.error("Error create folder", e.message);
  }
}

setInterval(createFolder, 60_000);

setInterval(() => {
  const file = path.join(currentFolder, `log_${Date.now()}.txt`);
  const type = Math.random() > 0.5 ? "success" : "error";
  const msg = type === "success" ? "Everything is ok " : "Error ";
  logMessage(file, msg, type);
  console.log(` ${type.toUpperCase()} log`);
}, 10_000);
