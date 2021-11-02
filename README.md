# Kaluma Agent

Kaluma Agent is a desktop service application to communicate Kaluma-compatible boards from external applications (e.g. Kaluma IDE).

## Table of Contents

* [Overview](#overview)
* [Communication Protocol](#communication-protocol)
  * [Commands](#commands)
    * [cmd:list](#cmdlist)
    * [cmd:open](#cmdopen)
    * [cmd:close](#cmdclose)
    * [cmd:write](#cmdwrite)
    * [cmd:upload](#cmdupload)
  * [Events](#events)
    * [event:found](#eventfound)
    * [event:lost](#eventlost)
    * [event:open](#eventopen)
    * [event:close](#eventclose)
    * [event:close-disconnected](#eventclose-disconnected)    
    * [event:data](#eventdata)
    * [event:error](#eventerror)
* [Device Object](#device-object)

## Overview

Main features of Kaluma Agent are:

* Periodically scan available devices. (default 3 seconds)
* Allow to manage multiple opened devices.

## Communication Protocol

It provides socket.io based protocol and the socket port is `54094`.

Before to send command or listen to events, you need to establish a connection to the agent via socket.io protocol.

```js
const io = require('socket.io-client')

var socket_client = io('http://localhost:54094')

socket_client.on('connect', () => { /* ... */ })
socket_client.on('disconnect', () => { /* ... */ })
```

### Commands

Here are some commands which can be sent to Kaluma Agent.

#### cmd:list

* `callback`: `<Function>`
  * `err` : `<Error>`
  * `devices` : `<Array<DeviceObject>>`

Request a list of available devices (ready to open -- _already plugged to USB or discovered wirelessly_) connected via serial ports.

```js
socket_client.emit('cmd:list', (err, deviceObjects) => {
  if (err) {
    // handle error
  } else {
    console.log(deviceObjects)
  }
})
```

#### cmd:open

* `path` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`

Request to open the specified serial port.

```js
socket_client.emit('cmd:open', '/dev/tty.usbmodem0001' (err) => {
  if (err) {
    // handle error
  } else {
    console.log('opened')
  }
})
```

#### cmd:close

* `path` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`

Request to close the specified serial port.

```js
socket_client.emit('cmd:close', '/dev/tty.usbmodem0001' (err) => {
  if (err) {
    // handle error
  } else {
    console.log('closed')
  }
})
```

#### cmd:write

* `path` : `<string>`
* `data` : `<string|Uint8Array>`
* `callback` : `<Function>`
  * `err` : `<Error>`

Send data to the serial port.

```js
socket_client.emit('cmd:write', '/dev/tty.usbmodem0001', '1+2\r', err => {
  if (err) {
    // handle error
  } else {
    console.log('done')
  }
})
```

#### cmd:upload

* `path` : `<string>`
* `code` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`

Upload code to the serial port.

```js
socket_client.emit('cmd:upload', '/dev/tty.usbmodem0001', 'console.log("hello,world!")', (err) => {
  if (err) {
    // handle error
  } else {
    console.log('code uploaded.')
  }
})
```

### Events

Here are some events from Agent. You can also use events from original socket.io (e.g. `connect`, `disconnect`, `connect_error`, `connect_timeout`, `error`, ... For more: [Socket.IO Client API](https://socket.io/docs/client-api/)).

#### event:open

* `path` : `<string>`

Triggered when the serial port is open.

```js
socket_client.on('event:open', (path) => {
  console.log(path)
})
```

#### event:close

* `path` : `<string>`

Triggered when the serial port is closed.

```js
socket_client.on('event:close', (path) => {
  console.log(path)
})
```

#### event:close-disconnected

* `path` : `<string>`

Triggered when the serial port is closed by disconnection (e.g. unplug the device from computer)

```js
socket_client.on('event:close-disconnected', (path) => {
  console.log(path)
})
```

#### event:data

* `path` : `<string>`
* `data` : `<string>` Received data.

Triggered when data is received from the serial port.

```js
socket_client.on('event:data', (path, data) => {
  console.log(path, data)
})
```

#### event:error

* `path` : `<string>`
* `err` : `<string>` Error message.

Triggered when error is occurred.

```js
socket_client.on('event:data', (path, err) => {
  console.error(path, err)
})
```

## Device Object

Device object is JSON object including device's information:

* `path` : `<string>`
* `manufacturer` : `<string>`
* `serialNumber` : `<string>`
* `pnpId` : `<string>`
* `locationId` : `<string>`
* `vendorId` : `<string>`
* `productId` : `<string>`
