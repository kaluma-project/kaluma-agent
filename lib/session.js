const EventEmitter = require('events')
const SerialPort = require('serialport')
const logger = require('./logger')
const { Device } = require('./device')

class Session extends EventEmitter {
  constructor (agent, socket) {
    super()

    /**
     * Agent
     * @type {Agent}
     */
    this.agent = agent

    /**
     * Socket
     * @type {Socket}
     */
    this.socket = socket

    /**
     * Lastest scan info of serial ports
     * @type {Array<PortInfo>}
     */
    this.portInfoArray = []

    /**
     * List of devices
     * @type {Array<Device>}
     */
    this.devices = []

    this.setup()
  }

  /**
   * Setup a session
   */
  setup () {
    this.handleCommands()
  }

  /**
   * Close this session with all serial devices
   */
  close () {
    this.devices.forEach(d => {
      d.close()
      this.remove(d)
    })
    this.devices = []
  }

  /**
   * Handle commands
   */
  handleCommands () {
    this.socket.on('cmd:scan', (cb) => {
      // this.scan()
    })

    this.socket.on('cmd:list', (cb) => {
      logger.info(`[device-${this.socket.id}] cmd:list`)
      this.list(cb)
    })

    this.socket.on('cmd:open', (path, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:open - ${path}`)
      var portInfo = this.portInfoArray.find(p => p.path === path)
      var device = new Device(this, portInfo)
      if (device) {
        device.open(err => {
          if (err) {
            logger.error(err)
            if (cb) cb(err)
          } else {
            this.add(device)
            this.agent.logSessions()
            if (cb) cb()
          }
        })
      }
    })

    this.socket.on('cmd:close', (path, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:close - ${path}`)
      var device = this.getDevice(path)
      if (device && device.serial.isOpen) {
        device.close(err => {
          if (err) {
            logger.error(err)
            if (cb) cb(err)
          } else {
            this.remove(device)
            this.socket.emit('event:close', path)
            if (cb) cb()
          }
        })
      } else {
        this.remove(device)
        if (cb) cb()
      }
    })

    this.socket.on('cmd:write', (path, data, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:write - ${path}  :  "${data.trim()}"`)
      var device = this.getDevice(path)
      if (device) {
        device.write(data, cb)
      }
    })

    this.socket.on('cmd:upload', (path, code, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:upload - ${path}`)
      var device = this.getDevice(path)
      if (device) {
        device.upload(code, cb)
      }
    })

    this.socket.on('cmd:firmware-update-check', (path, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:firmware-update-check - ${path}`)
      var device = this.getDevice(path)
      if (device) {
        device.checkForUpdate(cb)
      }
    })

    this.socket.on('cmd:firmware-update', (path, url, callback) => {
      logger.info(`[socket-${this.socket.id}] cmd:firmware-update - ${path}`)
      var device = this.getDevice(path)
      if (device) {
        device.downloadAndUpdate(url, callback)
      }
    })
  }

  /**
   * List all available devices
   * @param {(err: Error, devices) => void} cb
   */
  list (cb) {
    SerialPort.list()
      .then(ports => {
        // Filter ports only having vendorId and productId
        this.portInfoArray = ports.filter(p => p.vendorId && p.productId)
        if (cb) cb(null, this.portInfoArray)
        this.portInfoArray.forEach(p => {
          logger.info(`  [cmd:list] ${p.path}`)
        })
      })
      .catch(err => {
        if (cb) cb(err)
        this.socket.emit('event:error', err)
      })
  }

  /**
   * Get a device by path
   * @param {string} path
   * @return {Device}
   */
  getDevice (path) {
    return this.devices.find(d => d.path === path)
  }

  /**
   * Add a device
   * @param {Device} device
   */
  add (device) {
    this.bind(device)
    this.devices.push(device)
  }

  /**
   * Remove a device
   * @param {Device} device
   */
  remove (device) {
    if (device) {
      this.unbind(device)
      var idx = this.devices.indexOf(device)
      if (idx > -1) {
        this.devices.splice(idx, 1)
      }
    }
  }

  /**
   * Bind event handlers for serial port
   * @param {Device} device
   */
  bind (device) {
    device.serial.on('data', (data) => {
      var str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.socket.emit('event:data', device.path, str)
    })
    device.serial.on('open', err => {
      if (err) {
        this.socket.emit('event:error', device.path, err)
      } else {
        this.socket.emit('event:open', device.path)
      }
    })
    device.serial.on('close', err => {
      if (err) {
        if (err.disconnected) {
          this.socket.emit('event:close-disconnected', device.path)
        } else {
          this.socket.emit('event:error', device.path, err)
        }
      } else {
        this.socket.emit('event:close', device.path)
      }
    })
    device.serial.on('error', err => {
      this.socket.emit('event:error', device.path, err)
    })
  }

  /**
   * Unbind event handlers
   * @param {Device} device
   */
  unbind (device) {
    device.serial.removeAllListeners('data')
    device.serial.removeAllListeners('open')
    device.serial.removeAllListeners('close')
  }

  /**
   * Trigger event via socket.io
   */
  trigger (event, ...args) {
    this.socket.emit(event, ...args)
  }
}

exports.Session = Session
