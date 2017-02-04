# Kameleon Agent

## APIs

### Serial-port APIs

#### Commands

`serial:list`

* Get a list of available devices connected via serial ports.
* arguments
  * (none)
* return
  * `Array.<{comName:string, manufacturer:string, serialNumber:string, pnpId:string, locationId:string, vendorId:string, productId:string}>`

`serial:write`

* Send data to the connected device.
* arguments
  * `data`: string
* return
  * (none)

#### Events

`serial:open`

`serial:close`

`serial:data`

`serial:error`
