const EventEmitter = require('events')
const SerialPort = require('serialport')
const config = require('../config')
const protocol = require('kameleon-cli/lib/protocol')

/**
 * Device object
 */
class Device extends EventEmitter {
  constructor (agent, portInfo) {
    super()
    this.agent = agent
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
      this.isOpen = false
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
      this.agent.trigger('serial:data', this.serial.path, str)
      this.emit('data', str)
    })
    this.serial.on('open', err => {
      if (err) {
        console.error(err)
        this.isOpen = this.serial.isOpen
        this.agent.trigger('serial:error', this.serial.path, err)
        this.emit('error', err)
      } else {
        console.log('serial:open - ', this.serial.path)
        this.isOpen = this.serial.isOpen
        this.agent.trigger('serial:open', this.serial.path)
        this.agent.trigger('serial:open', this.serial.path)
        this.emit('open', this.serial.path)
      }
    })
    this.serial.on('close', err => {
      if (err) {
        console.error(err)
        this.agent.trigger('serial:error', this.serial.path, err)
        this.emit('error', err)
      } else {
        console.log('serial:close - ', this.serial.path)
        this.agent.trigger('serial:close', this.serial.path)
        this.emit('close')
      }
    })
    this.isOpen = this.serial.isOpen
  }

  /**
   * Open a serial port for the device
   */
  open () {
    if (this.serial && !this.serial.isOpen) {
      this.serial.open()
    } else {
      console.log('Already opened - ' + this.comName)
    }
  }

  /**
   * Close the serial port for the device
   */
  close () {
    if (this.serial && this.serial.isOpen) {
      this.serial.close()
    } else {
      console.log('Already closed - ' + this.comName)
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
      console.log('Already closed - ' + this.comName)
    }
  }

  /**
   * Update code to the serial port
   * @param {string} code
   */
  upload (code) {
    console.log('Uploading code - ', this.serial.path)
    protocol.write(this.serial, code, (err, result) => {
      if (err) {
        console.error('serial:error - ', err)
        this.agent.trigger('serial:error', this.serial.path, 'Upload failed')
        this.emit('serial:error', this.serial.path, 'Upload failed')
      } else {
        console.log(result)
        setTimeout(() => {
          // load written code
          this.serial.write('\r\r\r')
          this.serial.write('.load\r')
          console.log('Code uploaded - ', this.serial.path)
          this.agent.trigger('serial:upload', this.serial.path)
          this.emit('serial:upload', this.serial.path)
        }, 1000)
      }
    })
  }

  /**
   * Return whether the port is open
   * @type {boolean}
   */
  /*
  get isOpen () {
    return this.serial.isOpen
  }
  */

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
