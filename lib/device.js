const SerialPort = require('serialport')
const config = require('../config')
const protocol = require('kameleon-cli/lib/protocol')
const request = require('request')
const semver = require('semver')

const CHECK_UPDATE_URL = 'https://api.github.com/repos/kameleon-project/kameleon/releases/latest'

const serialOptions = {
  autoOpen: false,
  baudRate: 115200
}

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
    /**
     * An instance of SerialPort
     * @private
     * @type {SerialPort}
     */
    this.serial = new SerialPort(this.comName, serialOptions)

    /**
     * Indicates in firmware updating mode or not
     * @type {boolean}
     */

    this.dataHandler = (data) => {
      var str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.agent.trigger('event:data', this.serial.path, str)
    }
  }

  /**
   * Bind event handlers for serial port
   */
  bind () {
    this.serial.on('data', this.dataHandler)
    this.serial.on('open', err => {
      if (err) {
        this.agent.trigger('event:error', this.serial.path, err)
      } else {
        this.agent.trigger('event:open', this.serial.path)
      }
    })
    this.serial.on('close', err => {
      if (err) {
        this.agent.trigger('event:error', this.serial.path, err)
      } else {
        this.agent.trigger('event:close', this.serial.path)
      }
    })
    this.serial.on('error', err => {
      this.agent.trigger('event:error', this.serial.path, err)
    })
  }

  /**
   * Unbind all event handlers for serial port
   */
  unbind () {
    this.serial.removeAllListeners('data')
    this.serial.removeAllListeners('open')
    this.serial.removeAllListeners('close')
  }

  /**
   * Open a serial port for the device
   * @param {function (err:Error)} callback
   */
  open (callback) {
    if (this.serial && !this.serial.isOpen) {
      this.serial.open(err => {
        if (err) {
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
            this.unbind()
            callback()
          }
        }
      })
    } else {
      if (callback) {
        this.unbind()
        callback()
      }
      this.agent.trigger('event:close', this.serial.path)
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
        if (callback) {
          callback('Upload failed') /* eslint-disable-line */
        }
      } else {
        setTimeout(() => {
          // load written code
          this.serial.write('\r\r\r')
          this.serial.write('.load\r')
          console.log('Code uploaded - ', this.serial.path)
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
      var strip = data.replace(/\x1b\[[^a-zA-Z]*[A-Za-z]/g, '') /* eslint-disable-line */
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
   * Check for firmware update
   */
  checkForUpdate (callback) {
    if (this.serial.isOpen) {
      this.eval('process.version', (err, output) => {
        if (err) {
          callback(err)
        } else {
          const version = output
          const options = {
            method: 'GET',
            uri: CHECK_UPDATE_URL,
            json: true,
            headers: {
              'User-Agent': 'Kameleon Agent'
            }
          }
          request(options, (error, response, body) => {
            if (error) {
              callback(error)
            } else {
              var firmwareInfo = null
              if (body.assets && body.assets.length > 0) {
                body.assets.forEach(asset => {
                  if (asset.name === `${this.id}.bin`) {
                    firmwareInfo = {
                      version: body.name,
                      name: asset.name,
                      size: asset.size,
                      url: asset.browser_download_url,
                      updated_at: asset.updated_at
                    }
                  }
                })
              }
              // console.log(firmwareInfo)
              if (firmwareInfo && semver.gt(firmwareInfo.version, version)) {
                callback(null, firmwareInfo)
              } else {
                callback(null, null)
              }
            }
          })
        }
      })
    } else {
      callback('Port is not opened') /* eslint-disable-line */
    }
  }

  /**
   * Download and update firmware
   */
  downloadAndUpdate (url, callback) {
    if (this.serial.isOpen) {
      // download start
      this.agent.addException(this.serial.path)
      this.agent.trigger('event:firmware-updating', this.serial.path, { state: 'download-start' })
      const options = {
        method: 'GET',
        uri: url,
        encoding: null,
        headers: {
          'User-Agent': 'Kameleon Agent'
        }
      }
      request(options, (err, response, body) => {
        if (err) {
          this.agent.removeException(this.serial.path)
          callback(err)
        } else {
          // download complete
          this.agent.trigger('event:firmware-updating', this.serial.path, { state: 'download-complete' })
          this.unbind()
          protocol.send(this.serial, '.firmup', () => {
            // Wait 3sec to re-identify serial port after reboot
            setTimeout(() => {
              this.agent.enforceLost(this.serial.path)
              // close port because rebooted in bootloader mode
              if (this.serial.isOpen) {
                this.serial.close()
              }
              // update start
              this.agent.trigger('event:firmware-updating', this.serial.path, { state: 'update-start' })
              this.serial.open(err => {
                if (err) {
                  this.agent.removeException(this.serial.path)
                  callback(err)
                } else {
                  const step = 1024 * 32
                  var checkPoint = step
                  const progressCallback = (progress) => {
                    if (progress.writtenBytes >= checkPoint) {
                      var kb = Math.floor(progress.writtenBytes / 1024)
                      var percent = Math.floor((progress.writtenBytes / progress.totalBytes) * 100)
                      checkPoint = checkPoint + step
                      if (checkPoint > progress.totalBytes) {
                        checkPoint = progress.totalBytes
                      }
                      console.log(kb + 'KB uploaded (' + percent + '%)', this.serial.path)
                      // updating
                      this.agent.trigger('event:firmware-updating', this.serial.path, { state: 'updating', progress: progress })
                    }
                  }
                  const completeCallback = (err, result) => {
                    if (err) {
                      console.log(err)
                      this.agent.removeException(this.serial.path)
                      callback(err)
                    } else {
                      // complete
                      this.agent.trigger('event:firmware-updating', this.serial.path, { state: 'complete' })
                      callback(null)
                      // Close the serial after firmware update complete
                      setTimeout(() => {
                        this.agent.removeException(this.serial.path)
                        if (this.serial.isOpen) {
                          this.serial.close()
                        }
                      }, 500)
                    }
                  }
                  protocol.update(this.serial, body, completeCallback, progressCallback)
                }
              })
            }, 3000)
          })
        }
      })
    } else {
      callback('Port is not opened') /* eslint-disable-line */
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
