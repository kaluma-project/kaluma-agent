# Kameleon Agent

Kameleon Agent is a desktop service application to communicate Kameleon-compatible boards from external applications (e.g. Kameleon Web Editor).

## Table of Contents

* [Communication Protocol](#communication-protocol)
  * [Commands](#commands)
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

## Communication Protocol

It provides socket.io based protocol and the socket port is `54094`.

### Commands

Here are some commands which can be sent to Kameleon Agent.

#### cmd:list

* `callback`: `<Function>`
  * `devices` : `<Array.<DeviceObject>>`

Request a list of available devices connected via serial ports.

```js
socket_io_client.emit('cmd:list', (deviceObjects) => {
  console.log(deviceObjects)
})
```

#### cmd:open

* `comName` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`
  * `device`: `<DeviceObject>`

Request to open the specified serial port.

```js
socket_io_client.emit('cmd:open', '/dev/tty.usbmodem0001' (err, device) => {
  if (err) {
    // handle error
  } else {
    console.log('opened', device)
  }
})
```

#### cmd:close

* `comName` : `<string>`
* `callback` : `<Function>`
  * `err` : `<Error>`
  * `device`: `<DeviceObject>`

Request to close the specified serial port.

```js
socket_io_client.emit('cmd:close', '/dev/tty.usbmodem0001' (err, device) => {
  if (err) {
    // handle error
  } else {
    console.log('closed', device)
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
socket_io_client.emit('cmd:write', '/dev/tty.usbmodem0001', '1+2\r', err => {
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
socket_io_client.emit('cmd:upload', '/dev/tty.usbmodem0001', 'console.log("hello,world!")', (err) => {
  if (err) {
    // handle error
  } else {
    console.log('code uploaded.')
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
socket_io_client.emit('cmd:firmware-update', '/dev/tty.usbmodem0001', binary, (err) => {
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
socket_io_client.on('event:found', (devices) => {
  console.log(devices)
})
```

#### event:lost

* `devices` : `<Array<DeviceObject>>`

Trigger when some devices are lost.

```js
socket_io_client.on('event:lost', (devices) => {
  console.log(devices)
})
```

#### event:open

* `comName` : `<string>`

Triggered when the serial port is open.

```js
socket_io_client.on('event:open', (comName) => {
  console.log(comName)
})
```

#### event:close

* `comName` : `<string>`

Triggered when the serial port is closed.

```js
socket_io_client.on('event:close', (comName) => {
  console.log(comName)
})
```

#### event:data

* `comName` : `<string>`
* `data` : `<string>` Received data.

Triggered when data is received from the serial port.

```js
socket_io_client.on('event:data', (comName, data) => {
  console.log(comName, data)
})
```

#### event:error

* `comName` : `<string>`
* `err` : `<string>` Error message.

Triggered when error is occurred.

```js
socket_io_client.on('event:data', (comName, err) => {
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
