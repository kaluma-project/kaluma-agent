/* eslint no-control-regex: 0 */

const SerialPort = require('serialport')
const config = require('../config')
const protocol = require('kameleon-cli/lib/protocol')

/**
 * Device object
 */
class Device {
  constructor (agent, portInfo) {
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

    this.dataHandler = (data) => {
      var str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.agent.trigger('device:data', this.serial.path, str)
    }
  }

  /**
   * Bind event handlers for serial port
   */
  bind () {
    this.serial.on('data', this.dataHandler)
    this.serial.on('open', err => {
      if (err) {
        this.agent.trigger('device:error', this.serial.path, err)
      } else {
        this.agent.trigger('device:open', this.serial.path)
      }
    })
    this.serial.on('close', err => {
      if (err) {
        this.agent.trigger('device:error', this.serial.path, err)
      } else {
        this.agent.trigger('device:close', this.serial.path)
      }
    })
    this.serial.on('error', err => {
      this.agent.trigger('device:error', this.serial.path, err)
    })
  }

  /**
   * Open a serial port for the device
   * @param {function (err:Error)} callback
   */
  open (callback) {
    if (this.serial && !this.serial.isOpen) {
      this.serial.open(err => {
        if (err) {
          // this.agent.trigger('device:error', this.serial.path, err)
          if (callback) {
            callback(err)
          }
        } else {
          this.bind()
          if (callback) {
            callback()
          }
        }
      })
    } else {
      if (callback) {
        callback()
      }
      console.log('Already opened - ' + this.comName)
    }
  }

  /**
   * Close the serial port for the device
   */
  close (callback) {
    if (this.serial && this.serial.isOpen) {
      this.serial.close(err => {
        if (err) {
          if (callback) {
            callback(err)
          }
        } else {
          if (callback) {
            callback()
          }
        }
      })
    } else {
      if (callback) {
        callback()
      }
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
   * @param {function(err:Error)} callback
   */
  upload (code, callback) {
    console.log('Uploading code - ', this.serial.path)
    protocol.write(this.serial, code, (err, result) => {
      if (err) {
        console.error('serial:error - ', err)
        // this.agent.trigger('device:error', this.serial.path, 'Upload failed')
        if (callback) {
          callback(new Error('Upload failed'))
        }
      } else {
        setTimeout(() => {
          // load written code
          this.serial.write('\r\r\r')
          this.serial.write('.load\r')
          console.log('Code uploaded - ', this.serial.path)
          // this.agent.trigger('device:upload', this.serial.path)
          if (callback) {
            callback()
          }
        }, 1000)
      }
    })
  }

  /**
   * Evaluate code and return output
   * @param {string} code
   * @param {function(err:Error,output:string)} callback
   */
  eval (code, callback) {
    function stripEscapes (data) {
      var strip = data.replace(/\x1b\[[^a-zA-Z]*[A-Za-z]/g, '')
      return strip
    }
    var info = ''
    const f = (data) => {
      var s = String.fromCharCode.apply(null, new Uint16Array(data))
      info = info + stripEscapes(s)
      if (info.includes('> \r')) { // detect end of output
        this.serial.off('data', f)
        this.serial.on('data', this.dataHandler)
        var lines = info.split('\n').map(s => s.trim()) // split into lines and trim them
        var filtered = lines.filter(s => s.length > 0 && !s.startsWith('>')) // extract only output
        var output = filtered.join('\n')
        if (callback) {
          callback(null, output)
        }
      }
    }
    this.serial.off('data', this.dataHandler)
    this.serial.on('data', f)
    this.serial.write(`\r${code}\r\r`)
  }

  /**
   * Return whether the port is open
   * @type {boolean}
   */
  get isOpen () {
    if (this.serial) {
      return this.serial.isOpen
    } else {
      return false
    }
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
