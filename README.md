# Kameleon Agent

Kameleon Agent is a desktop service application to communicate Kameleon-compatible boards from external applications (e.g. Kameleon Web Editor).

## Table of Contents

* [Overview](#overview)
* [Communication Protocol](#communication-protocol)
  * [Commands](#commands)
    * [cmd:scan](#cmdscan)
    * [cmd:list](#cmdlist)
    * [cmd:open](#cmdopen)
    * [cmd:close](#cmdclose)
    * [cmd:write](#cmdwrite)
    * [cmd:upload](#cmdupload)
    * [cmd:eval](#cmdeval)
    * [cmd:firmware-update](#cmdfirmare-update)
  * [Events](#events)
    * [event:found](#eventfound)
    * [event:lost](#eventlost)
    * [event:open](#eventopen)
    * [event:close](#eventclose)
    * [event:data](#eventdata)
    * [event:error](#eventerror)
* [Device Object](#device-object)

## Overview

Main features of Kameleon Agent are:

* Detects only Kameleon-compatible devices.
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

Here are some commands which can be sent to Kameleon Agent.

#### cmd:scan

Request to scan available devices instantly. Typically this command is not required because scan is periodically performed. If some devices are found or lost, `event:found`, `event:lost` will be triggered.

```js
socket_client.emit('cmd:scan')
socket_client.on('event:found', devices => { /* ... */ })
socket_client.on('event:lost', devices => { /* ... */ })
```

#### cmd:list

* `callback`: `<Function>`
  * `devices` : `<Array.<DeviceObject>>`

Request a list of available devices (ready to open -- _already plugged to USB or discovered wirelessly_) connected via serial ports.

> __Note:__ This command is not a serial scan action. It returns only available devices to be open.

```js
socket_client.emit('cmd:list', (deviceObjects) => {
  console.log(deviceObjects)
})
```

#### cmd:open

* `comName` : `<string>`
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

* `comName` : `<string>`
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

* `comName` : `<string>`
* `data` : `<string>`
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

* `comName` : `<string>`
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

#### cmd:eval

* `comName` : `<string>`
* `code` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`
  * `output`: `<string>`

Evaluate code in the device and then return output.

```js
socket_client.emit('cmd:eval', '/dev/tty.usbmodem0001', '1+2', (err, output) => {
  if (err) {
    // handle error
  } else {
    console.log(output)
  }
})
```

#### cmd:firmware-update

* `comName` : `<string>`
* `binary` : `<ArrayBuffer>`
* `callback` : `<Function>`
  * `err` : `<Error>`

Update firmware.

```js
var binary = // ... binary data of firmware
socket_client.emit('cmd:firmware-update', '/dev/tty.usbmodem0001', binary, (err) => {
  if (err) {
    // handle error
  } else {
    console.log('firmware updated.')
  }
})
```

### Events

Here are some events from Agent. You can also use events from original socket.io (e.g. `connect`, `disconnect`, `connect_error`, `connect_timeout`, `error`, ... For more: [Socket.IO Client API](https://socket.io/docs/client-api/)).

#### event:found

* `devices` : `<Array<DeviceObject>>`

Trigger when new devices are found.

```js
socket_client.on('event:found', (devices) => {
  console.log(devices)
})
```

#### event:lost

* `devices` : `<Array<DeviceObject>>`

Trigger when some devices are lost.

```js
socket_client.on('event:lost', (devices) => {
  console.log(devices)
})
```

#### event:open

* `comName` : `<string>`

Triggered when the serial port is open.

```js
socket_client.on('event:open', (comName) => {
  console.log(comName)
})
```

#### event:close

* `comName` : `<string>`

Triggered when the serial port is closed.

```js
socket_client.on('event:close', (comName) => {
  console.log(comName)
})
```

#### event:data

* `comName` : `<string>`
* `data` : `<string>` Received data.

Triggered when data is received from the serial port.

```js
socket_client.on('event:data', (comName, data) => {
  console.log(comName, data)
})
```

#### event:error

* `comName` : `<string>`
* `err` : `<string>` Error message.

Triggered when error is occurred.

```js
socket_client.on('event:data', (comName, err) => {
  console.error(comName, err)
})
```

## Device Object

Device object is JSON object including device's information:

* `id` : `<string>` -- e.g. "kameleon-core"
* `name` : `<string>` -- e.g. "Kameleon Core"
* `comName` : `<string>`
* `manufacturer` : `<string>`
* `serialNumber` : `<string>`
* `pnpId` : `<string>`
* `locationId` : `<string>`
* `vendorId` : `<string>`
* `productId` : `<string>`
* `isOpen`: `<boolean>` -- whether the serial port is opened or not.
