const EventEmitter = require('events')
const SerialPort = require('serialport')
const config = require('../config')

/**
 * Device object
 */
class Device extends EventEmitter {
  constructor (portInfo) {
    super()

    /**
     * An instance of SerialPort
     * @private
     * @type {SerialPort}
     */
    this._port = null

    var deviceInfo = Device.getDeviceInfo(portInfo.vendorId, portInfo.productId)
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
    this._port = new SerialPort(this.comName, options)
    this._port.on('data', data => {
      let str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.emit('data', str)
    })
    this._port.on('open', err => {
      if (err) {
        console.error(err)
        this.emit('error', err)
      } else {
        this.emit('open')
      }
    })
    this._port.on('close', err => {
      if (err) {
        console.error(err)
        this.socket.emit('error', err)
      } else {
        this.socket.emit('close')
      }
    })

    this._port.open(err => {
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
    if (this._port && this._port.isOpen) {
      this._port.close()
    } else {
      console.error('Port is not open: ' + this.comName)
    }
  }

  /**
   * Write data to the serial port
   * @param {string|Buffer|Array<number>} data
   */
  write (data) {
    if (this._port && this._port.isOpen) {
      this._port.write(data)
    } else {
      console.error('Port is not open: ' + this.comName)
    }
  }

  /**
   * Return whether the port is open
   * @type {boolean}
   */
  get isOpen () {
    return this._port.isOpen
  }

  /**
   * Return JSON object for the device
   * @return {Object}
   */
  toJson () {
    return {
      id: this.id,
      name: this.name,
      comName: this.comName,
      manufacturer: this.manufacturer,
      serialNumber: this.serialNumber,
      pnpId: this.pnpId,
      locationId: this.locationId,
      vendorId: this.vendorId,
      productId: this.productId
    }
  }
}

Device.getDeviceInfo = function (vendorId, productId) {
  return config.supportedDevices.find(d => {
    return (d.vendorId === vendorId) && (d.productId === productId)
  })
}

Device.isSupported = function (portInfo) {
  return config.supportedDevices.some(d => {
    return (d.vendorId === portInfo.vendorId) && (d.productId === portInfo.productId)
  })
}

module.exports = Device
