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
     * @type {Object<string, Device>}
     */
    this.devices = {}

    // Setup when I/O socket connection established
    io.on('connection', socket => {
      console.log('socket connected')
      this.socket = socket

      this.socket.on('device:list', (cb) => {
        cb(Object.values(this.devices).map(d => d.toJson()))
      })
      this.socket.on('device:open', (comName, callback) => { this.open(comName, callback) })
      this.socket.on('device:close', (comName, callback) => { this.close(comName, callback) })
      this.socket.on('device:write', (comName, data) => { this.write(comName, data) })
      this.socket.on('device:upload', (comName, code, callback) => { this.upload(comName, code, callback) })
      this.socket.on('device:eval', (comName, code, callback) => { this.eval(comName, code, callback) })

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
    let founds = []
    let losts = []
    SerialPort.list((err, portInfoArray) => {
      if (err) {
        this.socket.emit('device:error', err)
      } else if (portInfoArray) {
        // Filter supported devices
        portInfoArray.forEach(portInfo => {
          if (Device.isSupported(portInfo)) {
            scanned[portInfo.comName] = portInfo
          }
        })
        // Find lost devices
        for (let comName in this.devices) {
          if (!scanned[comName]) {
            let d = this.devices[comName]
            if (d.isOpen) {
              d.close()
            }
            delete this.devices[comName]
            losts.push(d.toJson())
          }
        }
        // Find new devices
        for (let comName in scanned) {
          if (!this.devices[comName]) {
            let d = new Device(this, scanned[comName])
            this.devices[comName] = d
            founds.push(d.toJson())
          }
        }
        // Trigger event
        if (founds.length > 0) {
          console.log('FOUND', founds)
          this.socket.emit('device:found', founds)
        }
        if (losts.length > 0) {
          console.log('LOST', losts)
          this.socket.emit('device:lost', losts)
        }
      }
    })
  }

  /**
   * Open a serial device
   * @param {string} comName Port to be open
   * @param {function(err:Error)} callback
   */
  open (comName, callback) {
    var device = this.devices[comName]
    if (device) {
      device.open(callback)
    }
  }

  /**
   * Close the specified port
   * @param {string} comName Port to be open
   * @param {function(err:Error)} callback
   */
  close (comName, callback) {
    var device = this.devices[comName]
    if (device && device.isOpen) {
      device.close(callback)
    } else {
      console.error('No opened port to close.')
    }
  }

  /**
   * Close all ports
   */
  closeAll () {
    for (var key in this.devices) {
      this.close(key)
    }
  }

  /**
   * Write data to the specified port
   * @param {string} comName Port to be open
   * @param {string|Buffer|Array<number>} data
   */
  write (comName, data) {
    var device = this.devices[comName]
    device.write(data)
  }

  /**
   * Write code to the specified port
   * @param {string} comName Port to be open
   * @param {string} code
   * @param {function(err:Error)} callback
   */
  upload (comName, code, callback) {
    var device = this.devices[comName]
    device.upload(code, callback)
  }

  /**
   * Evaluate code and return result
   * @param {string} comName
   * @param {string} code
   * @param {function(err:Error,output:string)} callback
   */
  eval (comName, code, callback) {
    var device = this.devices[comName]
    device.eval(code, callback)
  }

  /**
   * Trigger 'device:open' event via socket.io
   */
  trigger (event, ...args) {
    this.socket.emit(event, ...args)
  }
}

module.exports = Agent
