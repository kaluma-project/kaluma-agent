const SerialPort = require('serialport')

/**
 * Serial Manager
 */
class SerialManager {

  constructor (socket) {
    this.socket = socket
    this.currentPort = null
    this.bind()
  }

  /**
   * Bind socket events and handlers
   */
  bind () {
    this.socket.on('serial:list', (fn) => { this.list(fn) })
    this.socket.on('serial:open', (port) => { this.open(port) })
    this.socket.on('serial:close', () => { this.close() })
    this.socket.on('serial:write', (data) => { this.write(data) })
  }

  /**
   * Get a list of connected serial ports
   * @return {function} callback
   */
  list (callback) {
    SerialPort.list((err, ports) => {
      if (err) {
        // error
      } else {
        console.log(ports)
        let data = []
        if (ports) {
          ports.forEach(function (port) {
            data.push(port)
          })
        }
        callback(data)
      }
    })
  }

  /**
   * Open a serial port
   * @param {string} port  comName of the port to be open
   */
  open (port) {
    this.currentPort = new SerialPort(port, {
      baudRate: 115200,
      parser: SerialPort.parsers.byteDelimiter([0x0D, 0x0A])
    })

    this.currentPort.on('open', function (err) {
      if (err) {
        this.socket.emit('serial:error', err)
      } else {
        this.socket.emit('serial:open', port)
        console.log('serial:open', port)
      }
    })

    this.currentPort.on('close', function (err) {
      if (err) {
        this.socket.emit('serial:error', err)
      } else {
        this.socket.emit('serial:close', port)
        console.log('serial:close', port)
      }
    })

    this.currentPort.on('data', function (data) {
      let str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.socket.emit('serial:data', str)
      console.log('serial:data', str)
    })
  }

  /**
   * Close the currently opened port
   */
  close () {
    this.currentPort.close()
  }

  write (data) {
    this.currentPort.write(data + '\r\n')
  }

}

module.exports = SerialManager