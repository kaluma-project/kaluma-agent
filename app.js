const {app} = require('electron')
const Agent = require('./lib/agent')
const AgentTray = require('./lib/tray')

var agent = null
var tray = null

// Run on startup
app.setLoginItemSettings({
  openAtLogin: app.isPackaged
})

// App ready
app.on('ready', () => {
  agent = new Agent()
  tray = new AgentTray(agent)
  tray.setup()
  agent.start()
})
