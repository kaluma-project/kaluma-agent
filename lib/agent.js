const EventEmitter = require('events')
// const expressApp = require('express')()
const http = require('http-shutdown')(require('http').createServer())
const io = require('socket.io')(http)
const SerialPort = require('serialport')
const Device = require('./device')

const SOCKET_PORT = 54094
const SCAN_INTERVAL = 3000 // 3 sec.

/**
 * Agent background service
 */
class Agent extends EventEmitter {
  constructor () {
    super()
    /**
     * I/O Socket
     */
    this.socket = null

    /**
     * Timer id for watch
     */
    this.timerId = null

    /**
     * A map of available devices
     * @type {Map<string, Device>}
     */
    this.devices = {}

    // Setup when I/O socket connection established
    io.on('connection', socket => {
      console.log('socket connected')
      this.socket = socket
      this.socket.on('list', (cb) => {
        cb(Object.values(this.devices).map(d => d.toJson()))
      })
      this.socket.on('open', (port) => { this.open(port) })
      this.socket.on('close', (port) => { this.close(port) })
      this.socket.on('write', (port, data) => { this.write(port, data) })
      this.socket.on('disconnect', () => {
        console.log('socket disconnected')
        this.unwatch()
      })
      this.watch()
    })
  }

  /**
   * Start agent service
   */
  start () {
    if (!http.listening) {
      http.listen(SOCKET_PORT, () => {
        console.log('agent started')
        this.emit('start')
      })
    }
  }

  /**
   * Stop agent service
   */
  stop () {
    http.shutdown(() => {
      console.log('agent stop')
      this.emit('stop')
    })
  }

  /**
   * Whether agent is running or not
   * @type {boolean}
   */
  get isRunning () {
    return http.listening
  }

  /**
   * Watch serial devices
   */
  watch () {
    this.timerId = setInterval(() => {
      this.scan()
    }, SCAN_INTERVAL)
  }

  /**
   * Stop to watch serial devices
   */
  unwatch () {
    clearInterval(this.timerId)
  }

  /**
   * Scan all available serial devices
   */
  scan () {
    let scanned = {}
    var founds = []
    var losts = []
    SerialPort.list((err, portInfoArray) => {
      if (err) {
        this.socket.emit('serial:error', err)
      } else if (portInfoArray) {
        // Filter supported devices
        portInfoArray.forEach(portInfo => {
          if (Device.isSupported(portInfo)) {
            var device = new Device(portInfo)
            scanned[device.comName] = device
          }
        })
        // Check disconnected ports
        for (let key in this.devices) {
          if (!scanned[key]) {
            losts.push(this.devices[key].toJson())
          }
        }
        // Check newly connected ports
        for (let key in scanned) {
          if (!this.devices[key]) {
            founds.push(scanned[key].toJson())
          }
        }
        this.devices = scanned
        // Trigger event
        if (founds.length > 0) {
          console.log('FOUND', founds)
          this.socket.emit('serial:found', founds)
        }
        if (losts.length > 0) {
          console.log('LOST', losts)
          this.socket.emit('serial:lost', losts)
        }
      }
    })
  }

  /**
   * Open a serial device
   * @param {string} comName Port to be open
   */
  open (comName) {
    var device = this.devices[comName]
    if (device) {
      device.open()
    }
  }

  /**
   * Close the specified port
   * @param {string} comName Port to be open
   */
  close (comName) {
    var device = this.devices[comName]
    if (device && device.isOpen) {
      device.close()
    } else {
      console.error('No opened port to close.')
    }
  }

  /**
   * Write data to the specified port
   * @param {string} comName Port to be open
   * @param {string|Buffer|Array<number>} data
   */
  write (comName, data) {
    var device = this.devices[comName]
    if (device && device.isOpen) {
      device.write(data)
    } else {
      console.error('No opened port to close.')
    }
  }

}

module.exports = Agent
