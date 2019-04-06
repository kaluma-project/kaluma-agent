const EventEmitter = require('events')
const SerialPort = require('serialport')
const config = require('../config')
const protocol = require('kameleon-cli/lib/protocol')

/**
 * Device object
 */
class Device extends EventEmitter {
  constructor (portInfo) {
    super()
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

    const options = {
      autoOpen: false,
      baudRate: 115200
    }
    /**
     * An instance of SerialPort
     * @private
     * @type {SerialPort}
     */
    this.serial = new SerialPort(this.comName, options)
    this.serial.on('data', data => {
      let str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.emit('data', str)
    })
    this.serial.on('open', err => {
      if (err) {
        console.error(err)
        this.emit('error', err)
      } else {
        console.log('port open: ', this.serial.path)
        this.emit('open')
      }
    })
    this.serial.on('close', err => {
      if (err) {
        console.error(err)
        this.emit('error', err)
      } else {
        console.log('port close: ', this.serial.path)
        this.emit('close')
      }
    })
  }

  /**
   * Open a serial port for the device
   */
  open () {
    this.serial.open(err => {
      if (err) {
        console.error(err)
        this.emit('error', err)
      } else {
        console.log(this.serial.isOpen)
      }
    })
  }

  /**
   * Close the serial port for the device
   */
  close () {
    if (this.serial && this.serial.isOpen) {
      console.log('try to close port: ', this.serial.path)
      this.serial.close()
    } else {
      console.error('Port is not open: ' + this.comName)
    }
  }

  /**
   * Write data to the serial port
   * @param {string|Buffer|Array<number>} data
   */
  write (data) {
    if (this.serial && this.serial.isOpen) {
      this.serial.write(data)
    } else {
      console.error('Port is not open: ' + this.comName)
    }
  }

  /**
   * Update code to the serial port
   * @param {string} code
   */
  upload (code) {
    console.log(this.serial.isOpen)
    protocol.write(this.serial, code, (err, result) => {
      if (err) {
        console.error(err)
      } else {
        console.log(result)
        setTimeout(() => {
          // load written code
          this.serial.write('\r\r\r')
          this.serial.write('.load\r')
          console.log('Code uploaded.')
        }, 1000)
      }
    })
  }

  /**
   * Return whether the port is open
   * @type {boolean}
   */
  get isOpen () {
    return this.serial.isOpen
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
