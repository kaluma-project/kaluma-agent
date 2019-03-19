const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
// const config = require('./config')
const path = require('path')
const electron = require('electron')
const electronApp = electron.app
const {Menu, Tray} = electron

const SerialManager = require('./lib/serial-manager')

let serialManager = null
let tray = null
let contextMenu = null

io.on('connection', function (socket) {
  console.log('socket.io connected')
  serialManager = new SerialManager(socket)
  serialManager.watch()
  socket.on('disconnect', () => {
    console.log('socket.io disconnected')
    serialManager.close()
    serialManager.unwatch()
  })
})

function updateMenu () {
  var startMenu = contextMenu.getMenuItemById('start')
  var stopMenu = contextMenu.getMenuItemById('stop')
  if (http.listening) {
    startMenu.enabled = false
    stopMenu.enabled = true
  } else {
    startMenu.enabled = true
    stopMenu.enabled = false
  }
}

function startAgent () {
  if (!http.listening) {
    http.listen(4000, function () {
      console.log('listening on *:4000')
      updateMenu()
    })
  }
}

function stopAgent () {
  if (http.listening) {
    http.close(function () {
      console.log('stop listening')
      updateMenu()
    })
  }
}

function closeAgent () {
  electronApp.quit()
}

// Run on startup
electronApp.setLoginItemSettings({
  openAtLogin: electronApp.isPackaged
})

electronApp.on('ready', () => {
  tray = new Tray(path.join(__dirname, 'res/images/kameleonTemplate.png'))
  contextMenu = Menu.buildFromTemplate([
    { id: 'start', label: 'Start Agent', click: startAgent },
    { id: 'stop', label: 'Stop Agent', click: stopAgent },
    { type: 'separator' },
    { id: 'close', label: 'Close', click: closeAgent }
  ])
  tray.setToolTip('Kameleon Agent')
  tray.setContextMenu(contextMenu)
  startAgent()
})
