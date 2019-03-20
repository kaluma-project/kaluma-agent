const path = require('path')
const {app, Menu, Tray} = require('electron')

class AgentTray {
  constructor (agent) {
    this.agent = agent
    this.tray = null
    this.contextMenu = null
  }

  setup () {
    this.agent.on('start', () => {
      this.updateMenu()
    })
    this.agent.on('stop', () => {
      this.updateMenu()
    })

    this.tray = new Tray(path.join(__dirname, '../res/images/kameleonTemplate.png'))
    this.contextMenu = Menu.buildFromTemplate([
      { id: 'start', label: 'Start Agent', click: () => { this.agent.start() } },
      { id: 'stop', label: 'Stop Agent', click: () => { this.agent.stop() } },
      { type: 'separator' },
      { id: 'close', label: 'Close', click: () => { app.quit() } }
    ])
    this.tray.setToolTip('Kameleon Agent')
    this.tray.setContextMenu(this.contextMenu)
  }

  updateMenu () {
    var startMenu = this.contextMenu.getMenuItemById('start')
    var stopMenu = this.contextMenu.getMenuItemById('stop')
    if (this.agent.isRunning) {
      startMenu.enabled = false
      stopMenu.enabled = true
    } else {
      startMenu.enabled = true
      stopMenu.enabled = false
    }
  }
}

module.exports = AgentTray
