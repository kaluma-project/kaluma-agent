const SerialPort = require('serialport')
const protocol = require('kameleon-cli/lib/protocol')
const semver = require('semver')
const request = require('request')

const CHECK_UPDATE_URL = 'https://api.github.com/repos/kameleon-project/kameleon/releases/latest'

const serialOptions = {
  autoOpen: false,
  baudRate: 115200
}

/**
 * Device class
 */
class Device {
  constructor (session, portInfo) {
    this.session = session
    this.portInfo = portInfo
    this.comName = this.portInfo.comName
    this.serial = new SerialPort(this.comName, serialOptions)
  }

  /**
   * Open serial port
   * @param {function(err:Error)} cb
   */
  open (cb) {
    this.serial.open(err => {
      if (err) {
        if (cb) cb(`Failed to open serial port: ${this.comName}.`) /* eslint-disable-line */
      } else {
        if (cb) cb(null)
      }
    })
  }

  /**
   * Close serial port
   * @param {function(err:Error)} cb
   */
  close (cb) {
    this.serial.close(cb)
  }

  /**
   * Write data to serial port
   * @param {string} data
   * @param {function(err:Error)} cb
   */
  write (data, cb) {
    this.serial.write(data, cb)
  }

  /**
   * Update code to the serial port
   * @param {string} code
   * @param {function(err:Error)} cb
   */
  upload (code, cb) {
    protocol.write(this.serial, code, (err, result) => {
      if (err) {
        if (cb) cb('Upload failed') /* eslint-disable-line */
      } else {
        setTimeout(() => {
          this.serial.write('\r')
          this.serial.write('.load\r')
          if (cb) cb()
        }, 1000)
      }
    })
  }

  /**
   * Evaluate code and return output
   * @param {string} code
   * @param {function(err:Error,output:string)} cb
   */
  eval (code, cb) {
    function stripEscapes (data) {
      var strip = data.replace(/\x1b\[[^a-zA-Z]*[A-Za-z]/g, '') /* eslint-disable-line */
      return strip
    }
    var info = ''
    const dataHandler = (data) => {
      var s = String.fromCharCode.apply(null, new Uint16Array(data))
      info = info + stripEscapes(s)
      if (info.includes('> \r')) { // detect end of output
        this.serial.off('data', dataHandler)
        this.session.bind(this)
        var lines = info.split('\n').map(s => s.trim()) // split into lines and trim them
        var filtered = lines.filter(s => s.length > 0 && !s.startsWith('>')) // extract only output
        var output = filtered.join('\n')
        if (cb) cb(null, output)
      }
    }
    this.session.unbind(this)
    this.serial.on('data', dataHandler)
    this.serial.write(`\r${code}\r\r`)
  }

  /**
   * Check for firmware update
   */
  checkForUpdate (cb) {
    if (this.serial.isOpen) {
      this.eval('process.version', (err, output) => {
        if (err) {
          if (cb) cb(err)
        } else {
          if (semver.valid(output)) {
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
                if (cb) cb(error)
              } else {
                var firmwareInfo = null
                if (body.assets && body.assets.length > 0) {
                  body.assets.forEach(asset => {
                    if (asset.name === `${this.portInfo.id}.bin`) {
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
                if (firmwareInfo && semver.gt(firmwareInfo.version, version)) {
                  if (cb) cb(null, firmwareInfo)
                } else {
                  if (cb) cb(null, null)
                }
              }
            })
          } else {
            if (cb) cb('Invalid version number') /* eslint-disable-line */
          }
        }
      })
    } else {
      if (cb) cb('Port is not opened') /* eslint-disable-line */
    }
  }

  /**
   * Download and update firmware
   */
  downloadAndUpdate (url, cb) {
    if (this.serial.isOpen) {
      // download start
      this.session.trigger('event:firmware-updating', this.comName, { state: 'download-start' })
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
          if (cb) cb(err)
        } else {
          // download complete
          this.session.trigger('event:firmware-updating', this.comName, { state: 'download-complete' })
          this.session.unbind(this)
          protocol.send(this.serial, '.firmup', () => {
            // Wait 3sec to re-identify serial port after reboot
            setTimeout(() => {
              // close port because rebooted in bootloader mode
              if (this.serial.isOpen) {
                this.serial.close()
              }
              // update start
              this.session.trigger('event:firmware-updating', this.comName, { state: 'update-start' })
              this.serial.open(err => {
                if (err) {
                  if (cb) cb(err)
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
                      console.log(kb + 'KB uploaded (' + percent + '%)', this.comName)
                      // updating
                      this.session.trigger('event:firmware-updating', this.comName, { state: 'updating', progress: progress })
                    }
                  }
                  const completeCallback = (err, result) => {
                    if (err) {
                      if (cb) cb(err)
                    } else {
                      // complete
                      this.session.trigger('event:firmware-updating', this.comName, { state: 'complete' })
                      if (cb) cb(null)
                      // Close the serial after firmware update complete
                      setTimeout(() => {
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
      if (cb) cb('Port is not opened') /* eslint-disable-line */
    }
  }
}

exports.Device = Device
