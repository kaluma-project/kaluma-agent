const SerialPort = require('serialport')
const protocol = require('@kaluma/cli/lib/protocol')

const serialOptions = {
  autoOpen: false,
  baudRate: 115200
}

/**
 * Device class
 */
class Device {
  constructor (session, portInfo) {
    this.session = session
    this.portInfo = portInfo
    this.path = this.portInfo.path
    this.serial = new SerialPort(this.path, serialOptions)
  }

  /**
   * Open serial port
   * @param {function(err:Error)} cb
   */
  open (cb) {
    this.serial.open(err => {
      if (err) {
        if (cb) cb(`Failed to open serial port: ${this.path}.`) /* eslint-disable-line */
      } else {
        if (cb) cb(null)
      }
    })
  }

  /**
   * Close serial port
   * @param {function(err:Error)} cb
   */
  close (cb) {
    this.serial.close(cb)
  }

  /**
   * Write data to serial port
   * @param {string} data
   * @param {function(err:Error)} cb
   */
  write (data, cb) {
    this.serial.write(data, cb)
    this.serial.drain()
  }

  /**
   * Update code to the serial port
   * @param {string} code
   * @param {function(err:Error)} cb
   */
  upload (code, cb) {
    protocol.write(this.serial, code, (err, result) => {
      if (err) {
        if (cb) cb('Upload failed') /* eslint-disable-line */
      } else {
        setTimeout(() => {
          this.serial.write('\r')
          this.serial.write('.load\r')
          this.serial.drain(() => {
            if (cb) cb()
          })
        }, 10)
      }
    })
  }
}

exports.Device = Device
