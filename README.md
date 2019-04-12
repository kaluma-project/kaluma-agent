# Kameleon Agent

Kameleon Agent provides socket.io based protocol which can be used by external applications (e.g. Web Editor) communicating Kameleon-compatible boards.

## Socket Protocol

### `Device` object

* `id` : `{string}`
* `name` : `{string}`
* `comName` : `{string}`
* `manufacturer` : `{string}`
* `serialNumber` : `{string}`
* `pnpId` : `{string}`
* `locationId` : `{string}`
* `vendorId` : `{string}`
* `productId` : `{string}`

### Command: 'list'

Request a list of available devices connected via serial ports.

* Returns: `{Array<Device>}`

```js
socket_io_client.emit('list', (devices) => {
  console.log(devices)
})
```

### Command: 'open'

Request to open the specified serial port.

* __`port`__ : `{string}`

### Command: 'close'

Request to close the specified serial port.

* __`port`__ : `{string}`

### Command: 'write'

Send data to the serial port.

* __`port`__ : `{string}`
* __`data`__ : `{string}`

### Command: 'upload'

Upload code to the serial port.

* __`port`__ : `{string}`
* __`code`__ : `{string}`

### Event: 'connect'

Triggered when successfully connected to Agent via socket.io. (This is socket.io's original event)

### Event: 'disconnect'

Triggered when disconnected from Agent. (This is socket.io's original event)

### Event: 'connect_error'

Triggered when error during try to connect (This is socket.io's original event)

### Event: 'serial:found'

Trigger when new devices are found.

* __`devices`__ : `{Array<Device>}`

### Event: 'serial:lost'

Trigger when some devices are lost.

* __`devices`__ : `{Array<Device>}`

### Event: 'serial:open'

* __`comName`__ : `{string}`

Triggered when the serial port is open.

### Event: 'serial:close'

Triggered when the serial port is closed.

* __`comName`__ : `{string}`

### Event: 'serial:data'

Triggered when data is received from the serial port.

* __`comName`__ : `{string}`
* __`data`__ : `{string}` Received data.

### Event: `serial:upload`

Triggered when code upload is completed.

* __`comName`__ : `{string}`

### Event: 'serial:error'

Triggered when error is occurred.

* __`comName`__ : `{string}`
* __`error`__ : `{string}` Error message.
