const EventEmitter = require('events')
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
     * A list of exception ports
     */
    this.exceptionPorts = []

    /**
     * A map of available devices
     * @type {Object<string, Device>}
     */
    this.devices = {}

    // Setup when I/O socket connection established
    io.on('connection', socket => {
      console.log('socket connected')
      this.socket = socket
      this.handleCommands()
      this.socket.on('disconnect', () => {
        console.log('socket disconnected')
        var clients = Object.keys(io.sockets.sockets)
        if (clients.length === 0) {
          console.log('stop watching')
          this.unwatch()
        }
      })
      if (!this.timerId) {
        console.log('started to watching')
        this.watch()
      }
    })
  }

  /**
   * Handle commands
   */
  handleCommands () {
    this.socket.on('cmd:scan', (cb) => {
      this.scan()
    })
    this.socket.on('cmd:list', (cb) => {
      cb(Object.values(this.devices).map(d => d.toJson()))
    })
    this.socket.on('cmd:open', (comName, callback) => { this.open(comName, callback) })
    this.socket.on('cmd:close', (comName, callback) => { this.close(comName, callback) })
    this.socket.on('cmd:write', (comName, data) => { this.write(comName, data) })
    this.socket.on('cmd:upload', (comName, code, callback) => { this.upload(comName, code, callback) })
    this.socket.on('cmd:eval', (comName, code, callback) => { this.eval(comName, code, callback) })
    this.socket.on('cmd:firmware-update-check', (comName, callback) => { this.checkForUpdate(comName, callback) })
    this.socket.on('cmd:firmware-update', (comName, url, callback) => { this.downloadAndUpdate(comName, url, callback) })
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
   * Add to exception list
   * @param {string} comName
   */
  addException (comName) {
    this.exceptionPorts.push(comName)
  }

  /**
   * Remove from exception list
   * @param {string} comName
   */
  removeException (comName) {
    var idx = this.exceptionPorts.indexOf(comName)
    if (idx > -1) {
      this.exceptionPorts.splice(idx, 1)
    }
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
    this.timerId = null
  }

  /**
   * Scan all available serial devices
   */
  scan () {
    SerialPort.list((err, portInfoArray) => {
      if (err) {
        this.socket.emit('event:error', err)
      } else if (portInfoArray) {
        var scanned = this.filter(portInfoArray)
        this.handleLost(scanned)
        this.handleFound(scanned)
      }
    })
  }

  /**
   * Filter only Kameleon-compatible devices
   * @param {Array<Object>} portInfoArray
   * @return {{string,Object}}
   */
  filter (portInfoArray) {
    var scanned = {}
    portInfoArray.forEach(portInfo => {
      if (Device.isSupported(portInfo)) {
        scanned[portInfo.comName] = portInfo
      }
    })
    return scanned
  }

  /**
   * Detect newly found devices from scan results
   * @param {Object} scanned
   */
  handleFound (scanned) {
    var founds = []
    for (let comName in scanned) {
      if (!this.devices[comName] && !this.exceptionPorts.includes(comName)) {
        let d = new Device(this, scanned[comName])
        this.devices[comName] = d
        founds.push(d.toJson())
      }
    }
    if (founds.length > 0) {
      console.log('FOUND', founds)
      this.socket.emit('event:found', founds)
    }
  }

  /**
   * Detect just lost devices from scan results
   * @param {Object} scanned
   */
  handleLost (scanned) {
    var losts = []
    for (let comName in this.devices) {
      if (!scanned[comName]) {
        let d = this.devices[comName]
        if (d) {
          d.close()
        }
        delete this.devices[comName]
        losts.push(d.toJson())
      }
    }
    if (losts.length > 0) {
      console.log('LOST', losts)
      this.socket.emit('event:lost', losts)
    }
  }

  /**
   * Enforce to lost event for a particular port
   * @param {string} comName
   */
  enforceLost (comName) {
    var device = this.devices[comName]
    if (device) {
      // device.close()
      delete this.devices[comName]
      this.socket.emit('event:lost', [device.toJson()])
    }
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
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
    }
  }

  /**
   * Close the specified port
   * @param {string} comName Port to be open
   * @param {function(err:Error)} callback
   */
  close (comName, callback) {
    var device = this.devices[comName]
    if (device) {
      device.close(callback)
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
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
    if (device) {
      device.write(data)
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
    }
  }

  /**
   * Write code to the specified port
   * @param {string} comName Port to be open
   * @param {string} code
   * @param {function(err:Error)} callback
   */
  upload (comName, code, callback) {
    var device = this.devices[comName]
    if (device) {
      device.upload(code, callback)
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
    }
  }

  /**
   * Evaluate code and return result
   * @param {string} comName
   * @param {string} code
   * @param {function(err:Error,output:string)} callback
   */
  eval (comName, code, callback) {
    var device = this.devices[comName]
    if (device) {
      device.eval(code, callback)
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
    }
  }

  /**
   * Check for firmware update
   * @param {string} comName
   * @param {function(err:Error,firmwareInfo:Object)} callback
   */
  checkForUpdate (comName, callback) {
    var device = this.devices[comName]
    if (device) {
      device.checkForUpdate(callback)
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
    }
  }

  /**
   * Download and update firmware
   * @param {string} comName
   * @param {string} url A url to download firmware binary file
   * @param {function(err:Error,firmwareInfo:Object)} callback
   */
  downloadAndUpdate (comName, url, callback) {
    var device = this.devices[comName]
    if (device) {
      device.downloadAndUpdate(url, callback)
    } else {
      callback(`Port not found (${comName})`) /* eslint-disable-line */
    }
  }

  /**
   * Trigger event via socket.io
   */
  trigger (event, ...args) {
    this.socket.emit(event, ...args)
  }
}

module.exports = Agent
