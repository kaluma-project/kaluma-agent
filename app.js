const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
// const path = require('path')

const SerialManager = require('./lib/serial-manager')

let serialManager = null

/*
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/index.html'))
})
*/

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

http.listen(4000, function () {
  console.log('listening on *:4000')
})
