# Kameleon Agent

Kameleon Agent is a desktop service application to communicate Kameleon-compatible boards from external applications (e.g. Kameleon Web Editor).

## Table of Contents

* [Overview](#overview)
* [Communication Protocol](#communication-protocol)
  * [Commands](#commands)
    * [cmd:list](#cmdlist)
    * [cmd:open](#cmdopen)
    * [cmd:close](#cmdclose)
    * [cmd:write](#cmdwrite)
    * [cmd:upload](#cmdupload)
    * [cmd:firmware-update-check](#cmdfirmware-update-check)
    * [cmd:firmware-update](#cmdfirmware-update)
  * [Events](#events)
    * [event:found](#eventfound)
    * [event:lost](#eventlost)
    * [event:open](#eventopen)
    * [event:close](#eventclose)
    * [event:close-disconnected](#eventclose-disconnected)    
    * [event:data](#eventdata)
    * [event:error](#eventerror)
    * [event:firmware-updating](#eventfirmware-updating)
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

#### cmd:firmware-update-check

* `comName` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`
  * `firmwareInfo` : `<Object>`
    * `version` : `<string>`
    * `name` : `<string>`
    * `size` : `<number>`
    * `url` : `<string>`
    * `updated_at` : `<string>`

Check for firmware update.

```js
socket_client.emit(
  'cmd:firmware-update-check',
  '/dev/tty.usbmodem0001',
  (err, firmwareInfo) => {
    if (err) {
      // handle error
    } else {
      if (firmwareInfo) {
        console.log('Update available')
      } else {
        console.log('No update available')
      }
    }
  }
)
```

#### cmd:firmware-update

* `comName` : `<string>`
* `url`: `<string>` A url to download firmware binary
* `callback` : `<Function>`
  * `err` : `<Error>`

Download and update firmware. This command will trigger updating status events: [event:firmware-updating](#eventfirmware-updating)

```js
socket_client.emit(
  'cmd:firmware-update',
  '/dev/tty.usbmodem0001',
  'https://github.com/kameleon-project/kameleon/releases/download/v1.0.0-beta.1/kameleon-core.bin',
  (err) => {
    if (err) {
      // handle error
    } else {
      console.log('firmware updated.')
    }
  }
)
```

### Events

Here are some events from Agent. You can also use events from original socket.io (e.g. `connect`, `disconnect`, `connect_error`, `connect_timeout`, `error`, ... For more: [Socket.IO Client API](https://socket.io/docs/client-api/)).

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

#### event:close-disconnected

* `comName` : `<string>`

Triggered when the serial port is closed by disconnection (e.g. unplug the device from computer)

```js
socket_client.on('event:close-disconnected', (comName) => {
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

#### event:firmware-updating

* `comName` : `<string>`
* `info` : `<Object>` Firmware updating state info.
  * `state` : `<string>` One of `'download-start'` | `'download-complete'` | `'update-start'` | `'updating'` | `'complete'`.
  * `progress` : `<Object>` Indicate progress of firmware update.
    * `totalBytes` : `<number>` Total size of firmware.
    * `writtenBytes` : `<number>` Updated size.

Triggered when firmware upating state changes

```js
socket_client.on('event:firmware-updating', (comName, info) => {
  console.log(comName, info)
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
* `firmwareVersion` : `<string>` -- e.g. "1.0.0-beta.1"
