const fs = require('fs');
function logMessage(filePath, message, type = 'info') { 
    try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}]: ${message}\n`;
    fs.appendFileSync(filePath, logEntry); 
}
catch (error) {
    console.error('Error weite log', error.message);
}
}
module.exports = { logMessage };