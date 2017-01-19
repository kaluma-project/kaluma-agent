var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SerialPort = require('serialport');

var currentSocket = null;
var currentPort = null;

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(4000, function() {
    console.log('listening on *:4000');
});

io.on('connection', function (socket) {
    console.log('socket.io connected');
    currentSocket = socket;

    // get device list
    socket.on('serial:list', function (arg, fn) {
        SerialPort.list(function (err, ports) {
            console.log(ports)
            if (ports) {
                var data = [];
                ports.forEach(function (port) {
                    data.push(port)
                });
            }
            fn(data)
        });
    });

    // 'serial:open'
    socket.on('serial:open', function (port) {
        currentPort = new SerialPort(port, {
            baudRate: 115200,
            parser: SerialPort.parsers.byteDelimiter([0x0D,0x0A])
        });

        currentPort.on('open', function (err) {
            if (err) {
                socket.emit('serial:error', err);
            } else {
                socket.emit('serial:open', port);
                console.log('serial:open')
            }
        });

        currentPort.on('close', function (err) {
            if (err) {
                socket.emit('serial:error', err);
            } else {
                socket.emit('serial:close', port);
                console.log('serial:close')
            }
        });

        currentPort.on('data', function (data) {
            var str = String.fromCharCode.apply(null, new Uint16Array(data))
            console.log(str)
            socket.emit('serial:data', str);
        });

    });

    // 'serial:close-port'
    socket.on('serial:close', function () {
        currentPort.close();
    });

    // 'serial:write'
    socket.on('serial:write', function (data) {
        /*
        var buf = Buffer.allocUnsafe(data.length + 2);
        for (var i = 0, len = data.length; i < len; i++) {
            buf[i] = data.charCodeAt(i);
        }
        buf[buf.length-2] = 0x0D;
        buf[buf.length-1] = 0x0A;
        */
        currentPort.write(data + "\r\n");
    });

});



/*
SerialPort.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port);
  });
});
*/

/*
var port = new SerialPort('/dev/cu.usbmodem1421');

port.on('open', function(err) {
    if (err) {
        console.log("Error: " + err);
    } else {
        console.log("Port opened.");
    }
    port.write('print("hello");\n');
});

port.on('error', function(err) {
    console.log('Error: ', err.message);
})

port.on('data', function (data) {
  console.log('Data: ' + data);
});
*/
