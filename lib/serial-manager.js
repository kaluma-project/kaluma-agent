const SerialPort = require('serialport')
const config = require('../config')

const SCAN_INTERVAL = 3000 // 3 sec.

/**
 * Serial Manager
 */
class SerialManager {

  constructor (socket) {
    this.socket = socket
    this.timerId = null

    /**
     * A list of available ports
     * @type {Object<comName:string, portInfo:PortInfo>}
     */
    this.availablePorts = {}

    /**
     * The currently connected (opened) port
     * @type {SerialPort}
     */
    this.currentPort = null

    this.bind()
  }

  watch () {
    this.timerId = setInterval(() => {
      this.scan()
    }, SCAN_INTERVAL)
  }

  unwatch () {
    clearInterval(this.timerId)
  }

  getSupportedDevice (vendorId, productId) {
    return config.supportedDevices.find(device => {
      return (device.vendorId === vendorId) && (device.productId === productId)
    })
  }

  /**
   * Bind socket events and handlers
   */
  bind () {
    this.socket.on('serial:scan', (fn) => { this.scan(fn) })
    this.socket.on('serial:open', (port) => { this.open(port) })
    this.socket.on('serial:close', () => { this.close() })
    this.socket.on('serial:write', (data) => { this.write(data) })
  }

  /**
   * Scan all available serial ports
   * @return {function} callback
   */
  scan (callback) {
    let founds = []
    let losts = []
    SerialPort.list((err, portInfoArray) => {
      if (err) {
        this.socket.emit('serial:error', err)
      } else if (portInfoArray) {
        // Filter supported devices
        let portInfoMap = {}
        portInfoArray.forEach(portInfo => {
          var vid = portInfo.vendorId ? portInfo.vendorId * 1 : -1
          var pid = portInfo.productId ? portInfo.productId * 1 : -1
          var device = this.getSupportedDevice(vid, pid)
          if (device) {
            portInfoMap[portInfo.comName] = portInfo
          }
        })

        // Check disconnected ports
        for (let key in this.availablePorts) {
          if (!portInfoMap[key]) {
            losts.push(this.availablePorts[key])
          }
        }

        // Check newly connected ports
        for (let key in portInfoMap) {
          if (!this.availablePorts[key]) {
            founds.push(portInfoMap[key])
          }
        }

        this.availablePorts = portInfoMap

        // Trigger event
        if (founds.length > 0) {
          console.log('FOUND', founds)
          this.socket.emit('serial:found', founds)
        }
        if (losts.length > 0) {
          console.log('LOST', losts)
          this.socket.emit('serial:lost', losts)
        }
        // Pass to callback
        if (callback) {
          callback(portInfoArray)
        }
      }
    })
  }

  /**
   * Open a serial port
   * @param {string} comName  comName of the port to be open
   */
  open (comName) {
    const options = {
      autoOpen: false,
      baudRate: 115200
    }
    if (this.currentPort) {
      this.currentPort.close()
      this.currentPort = null
    }
    this.currentPort = new SerialPort(comName, options)

    this.currentPort.on('data', data => {
      let str = String.fromCharCode.apply(null, new Uint16Array(data))
      this.socket.emit('serial:data', str)
      console.log('serial:data', str)
    })

    this.currentPort.on('open', err => {
      if (err) {
        console.error(err)
        this.socket.emit('serial:error', err)
      } else {
        this.socket.emit('serial:open', comName)
        console.log('serial:open', comName)
      }
    })

    this.currentPort.on('close', err => {
      if (err) {
        console.error(err)
        this.socket.emit('serial:error', err)
      } else {
        this.socket.emit('serial:close', comName)
        console.log('serial:close', comName)
      }
    })

    // open the port
    this.currentPort.open(err => {
      if (err) {
        console.error(err)
        this.socket.emit('serial:error', err)
      }
    })
  }

  /**
   * Close the currently opened port
   */
  close () {
    if (this.currentPort) {
      this.currentPort.close()
    } else {
      console.error('Currently no opened port to close.')
    }
  }

  write (data) {
    if (this.currentPort) {
      this.currentPort.write(data)
    } else {
      console.error('Currently no opened port to write.')
    }
  }

}

module.exports = SerialManager
