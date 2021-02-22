const path = require('path')
const { app, dialog, Menu, Tray } = require('electron')
const packageJson = require('../package.json')

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

    this.tray = new Tray(path.join(__dirname, '../res/images/kalumaTemplate.png'))
    this.contextMenu = Menu.buildFromTemplate([
      { id: 'about', label: 'About...', click: () => { this.showAboutDialog() } },
      { type: 'separator' },
      { id: 'start', label: 'Start Agent', click: () => { this.agent.start() } },
      { id: 'stop', label: 'Stop Agent', click: () => { this.agent.stop() } },
      { type: 'separator' },
      { id: 'close', label: 'Close', click: () => { app.quit() } }
    ])
    this.tray.setToolTip('Kaluma Agent')
    this.tray.setContextMenu(this.contextMenu)
  }

  showAboutDialog () {
    dialog.showMessageBox({ type: 'info', title: 'Kaluma Agent', message: `Kaluma Agent\nVersion: ${packageJson.version}` })
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
