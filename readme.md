# h5.modbus

Implementation of the MODBUS IP/ASCII/RTU master and slave over TCP/UDP/Serial/WebSocket for Node.js.

## TODO

  - Remaining messages
  - **Tests**
  - Documentation
  - npm publish

## Requirements

  * [Node.js](https://nodejs.org/) >= v8
  * [voodootikigod/node-serialport](https://github.com/voodootikigod/node-serialport) >= v6
    (only for serial port communication).
  * [websockets/ws](https://github.com/websockets/ws) >= v1
    (only for WebSocket communication).

## Installation

```
npm install github:morkai/h5.modbus#master
```

## Usage

```js
'use strict';

const modbus = require('h5.modbus');

const slave = modbus.createSlave({requestHandler: handleRequest});
const master = modbus.createMaster();

master.once('open', () => master.readHoldingRegisters(0x0000, 10, handleResponse));

function handleRequest(unit, request, respond)
{
  respond(modbus.ExceptionCode.IllegalFunctionCode);
}

function handleResponse(err, res)
{
  if (err)
  {
    console.error(`[master#error] ${err.message}`);
  }
  else if (res.isException())
  {
    console.log(`[master#exception] ${res}`);
  }
  else
  {
    console.log(`[master#response] ${res}`);
  }
}
```

## License

This project is released under the [MIT License](https://raw.github.com/morkai/h5.modbus/master/license.md).
