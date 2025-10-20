const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "logs", "logs.txt");
const typeArg = process.argv.find((arg) => arg.startsWith("--type="));
const type = typeArg ? typeArg.split("=")[1] : null;

if (!fs.existsSync(logFile)) {
  console.log("Log file does not exist.");
  process.exit(1);
}

const content = fs.readFileSync(logFile, "utf-8");
const lines = content.split("\n").filter(Boolean);

const success = lines.filter((line) => line.includes("[SUCCESS]")).length;
const error = lines.filter((line) => line.includes("[ERROR]")).length;

if (!type || type === "success") console.log(`Success: ${success}`);
if (!type || type === "error") console.log(`Error: ${error}`);
