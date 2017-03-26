const SerialPort = require('serialport')

const SCAN_INTERVAL = 3000 // 3 sec.

/**
 * Serial Manager
 */
class SerialManager {

  constructor (socket) {
    this.socket = socket
    this.timerId = null

    /**
     * A list of available ports
     */
    this.availablePorts = {}

    /**
     * The currently connected (opened) port
     */
    this.currentPort = null

    this.bind()
  }

  watch () {
    this.timerId = setInterval(() => {
      this.scan()
    }, SCAN_INTERVAL)
  }

  unwatch () {
    clearInterval(this.timerId)
  }

  /**
   * Bind socket events and handlers
   */
  bind () {
    this.socket.on('serial:scan', (fn) => { this.scan(fn) })
    this.socket.on('serial:open', (port) => { this.open(port) })
    this.socket.on('serial:close', () => { this.close() })
    this.socket.on('serial:write', (data) => { this.write(data) })
  }

  /**
   * Scan all available serial ports
   * @return {function} callback
   */
  scan (callback) {
    let founds = []
    let losts = []
    SerialPort.list((err, ports) => {
      if (err) {
        this.socket.emit('serial:error', err)
      } else if (ports) {
        // Make a map from comName to port
        let portMap = {}
        ports.forEach(port => {
          portMap[port.comName] = port
        })
        // Check disconnected ports
        for (let key in this.availablePorts) {
          if (!portMap[key]) {
            losts.push(this.availablePorts[key])
          }
        }
        // Check newly connected ports
        for (let key in portMap) {
          if (!this.availablePorts[key]) {
            founds.push(portMap[key])
          }
        }
        this.availablePorts = portMap
        // Trigger event
        if (founds.length > 0) {
          console.log('FOUND', founds)
          this.socket.emit('serial:found', founds)
        }
        if (losts.length > 0) {
          console.log('LOST', losts)
          this.socket.emit('serial:lost', losts)
        }
        // Pass to callback
        if (callback) {
          callback(ports)
        }
      }
    })
  }

  /**
   * Open a serial port
   * @param {string} port  comName of the port to be open
   */
  open (port) {
    const options = {
      autoOpen: false,
      baudRate: 115200
    }
    if (this.currentPort) {
      this.currentPort.close()
      this.currentPort = null
    }
    this.currentPort = new SerialPort(port, options)

    this.currentPort.on('data', data => {
      let str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.socket.emit('serial:data', str)
      console.log('serial:data', str)
    })

    this.currentPort.on('open', err => {
      if (err) {
        console.error(err)
        this.socket.emit('serial:error', err)
      } else {
        this.socket.emit('serial:open', port)
        console.log('serial:open', port)
      }
    })

    this.currentPort.on('close', err => {
      if (err) {
        console.error(err)
        this.socket.emit('serial:error', err)
      } else {
        this.socket.emit('serial:close', port)
        console.log('serial:close', port)
      }
    })

    // open the port
    this.currentPort.open(err => {
      if (err) {
        console.error(err)
        this.socket.emit('serial:error', err)
      }
    })
  }

  /**
   * Close the currently opened port
   */
  close () {
    if (this.currentPort) {
      this.currentPort.close()
    } else {
      console.error('Currently no opened port to close.')
    }
  }

  write (data) {
    if (this.currentPort) {
      this.currentPort.write(data)
    } else {
      console.error('Currently no opened port to write.')
    }
  }

}

module.exports = SerialManager
