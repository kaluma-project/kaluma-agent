const EventEmitter = require('events')
const SerialPort = require('serialport')
const config = require('../config')

/**
 * Device object
 */
class Device extends EventEmitter {
  constructor (portInfo) {
    super()
    this.port = null

    var vid = portInfo.vendorId ? portInfo.vendorId * 1 : -1
    var pid = portInfo.productId ? portInfo.productId * 1 : -1
    var deviceInfo = Device.getDeviceInfo(vid, pid)
    if (deviceInfo) {
      this.id = deviceInfo.id
      this.name = deviceInfo.name
      this.comName = portInfo.comName
      this.manufacturer = portInfo.manufacturer
      this.serialNumber = portInfo.serialNumber
      this.pnpId = portInfo.pnpId
      this.locationId = portInfo.locationId
      this.vendorId = portInfo.vendorId
      this.productId = portInfo.productId
      this.id = portInfo.id
      this.name = portInfo.name
    }
  }

  /**
   * Open a serial port for the device
   */
  open () {
    const options = {
      autoOpen: false,
      baudRate: 115200
    }
    this.port = new SerialPort(this.comName, options)
    this.port.on('data', data => {
      let str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.emit('data', str)
    })
    this.port.on('open', err => {
      if (err) {
        console.error(err)
        this.emit('error', err)
      } else {
        this.emit('open')
      }
    })
    this.port.on('close', err => {
      if (err) {
        console.error(err)
        this.socket.emit('error', err)
      } else {
        this.socket.emit('close')
      }
    })

    this.port.open(err => {
      if (err) {
        console.error(err)
        this.socket.emit('error', err)
      }
    })
  }

  /**
   * Close the serial port for the device
   */
  close () {
    if (this.port && this.port.isOpen) {
      this.port.close()
    } else {
      console.error('Port is not open: ' + this.comName)
    }
  }

  /**
   * Write data to the serial port
   * @param {string|Buffer|Array<number>} data
   */
  write (data) {
    if (this.port && this.port.isOpen) {
      this.port.write(data)
    } else {
      console.error('Port is not open: ' + this.comName)
    }
  }

  /**
   * Return whether the port is open
   * @type {boolean}
   */
  get isOpen () {
    return this.port.isOpen
  }
}

Device.getDeviceInfo = function (vendorId, productId) {
  return config.supportedDevices.find(device => {
    return (device.vendorId === vendorId) && (device.productId === productId)
  })
}

Device.isSupported = function (portInfo) {
  var vid = portInfo.vendorId ? portInfo.vendorId * 1 : -1
  var pid = portInfo.productId ? portInfo.productId * 1 : -1
  return config.supportedDevices.some(d => {
    return (d.vendorId === vid) && (d.productId === pid)
  })
}

module.exports = Device
