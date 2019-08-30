const { app } = require('electron')
const path = require('path')
var winston = require('winston')
const { combine, timestamp, label, printf } = winston.format

const myFormat = printf(({ message, timestamp }) => {
  return `${timestamp} ${message}`
})

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    label({ label: 'right meow!' }),
    timestamp(),
    myFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(app.getPath('userData'), 'combined.log') })
  ],
  silent: true
})

module.exports = logger
