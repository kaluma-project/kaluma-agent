const EventEmitter = require('events')
const SerialPort = require('serialport')
const logger = require('./logger')
const config = require('../config')
const { Device } = require('./device')

function isSupported (portInfo) {
  return config.supportedDevices.some(d => {
    return (d.vendorId === portInfo.vendorId) && (d.productId === portInfo.productId)
  })
}

function getDeviceInfo (vendorId, productId) {
  return config.supportedDevices.find(d => {
    return (d.vendorId === vendorId) && (d.productId === productId)
  })
}

function toDeviceObject (portInfo) {
  var info = getDeviceInfo(portInfo.vendorId, portInfo.productId)
  if (info) {
    return Object.assign(portInfo, info)
  }
  return null
}

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

    this.socket.on('cmd:open', (comName, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:open - ${comName}`)
      var portInfo = this.portInfoArray.find(p => p.comName === comName)
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

    this.socket.on('cmd:close', (comName, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:close - ${comName}`)
      var device = this.getDevice(comName)
      if (device && device.serial.isOpen) {
        device.close(err => {
          if (err) {
            logger.error(err)
            if (cb) cb(err)
          } else {
            this.remove(device)
            this.socket.emit('event:close', comName)
            if (cb) cb()
          }
        })
      } else {
        this.remove(device)
        if (cb) cb()
      }
    })

    this.socket.on('cmd:write', (comName, data, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:write - ${comName}  :  "${data.trim()}"`)
      var device = this.getDevice(comName)
      if (device) {
        device.write(data, cb)
      }
    })

    this.socket.on('cmd:upload', (comName, code, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:upload - ${comName}`)
      var device = this.getDevice(comName)
      if (device) {
        device.upload(code, cb)
      }
    })

    this.socket.on('cmd:eval', (comName, code, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:eval - ${comName}`)
      var device = this.getDevice(comName)
      if (device) {
        device.eval(code, cb)
      }
    })

    this.socket.on('cmd:firmware-update-check', (comName, cb) => {
      logger.info(`[socket-${this.socket.id}] cmd:firmware-update-check - ${comName}`)
      var device = this.getDevice(comName)
      if (device) {
        device.checkForUpdate(cb)
      }
    })

    this.socket.on('cmd:firmware-update', (comName, url, callback) => {
      logger.info(`[socket-${this.socket.id}] cmd:firmware-update - ${comName}`)
      var device = this.getDevice(comName)
      if (device) {
        device.downloadAndUpdate(url, callback)
      }
    })
  }

  /**
   * List all available devices
   */
  list (cb) {
    SerialPort.list((err, portInfos) => {
      if (err) {
        this.socket.emit('event:error', err)
      } else {
        this.portInfoArray = portInfos
          .filter(p => isSupported(p))
          .map(p => toDeviceObject(p))
        if (cb) cb(this.portInfoArray)

        this.portInfoArray.forEach(p => {
          logger.info(`  [cmd:list] ${p.comName}`)
        })
      }
    })
  }

  /**
   * Get a device by comName
   * @param {string} comName
   * @return {Device}
   */
  getDevice (comName) {
    return this.devices.find(d => d.comName === comName)
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
      this.socket.emit('event:data', device.comName, str)
    })
    device.serial.on('open', err => {
      if (err) {
        this.socket.emit('event:error', device.comName, err)
      } else {
        this.socket.emit('event:open', device.comName)
      }
    })
    device.serial.on('close', err => {
      if (err) {
        if (err.disconnected) {
          this.socket.emit('event:close-disconnected', device.comName)
        } else {
          this.socket.emit('event:error', device.comName, err)
        }
      } else {
        this.socket.emit('event:close', device.comName)
      }
    })
    device.serial.on('error', err => {
      this.socket.emit('event:error', device.comName, err)
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
