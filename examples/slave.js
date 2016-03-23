// Part of <http://miracle.systems/p/modbus-master> licensed under <MIT>

'use strict';

const modbus = require('../lib');
const ExceptionCode = modbus.ExceptionCode;
const FunctionCode = modbus.FunctionCode;
const stats = require('./stats');

const MAX_BUFFER_OVERFLOWS = Number.MAX_SAFE_INTEGER;
const DEBUG = false;
const DELAY = 0;

let clientCounter = 0;
const clientIdMap = new Map();
const clientOverflowMap = new Map();

// const transport = new modbus.RtuTransport({eofTimeout: 0});
const transport = new modbus.IpTransport({});
// const transport = new modbus.AsciiTransport({});
// const connection = new modbus.UdpConnection({});
// const listener = new modbus.UdpListener();
const listener = new modbus.TcpListener();

listener.on('open', () => console.log('listener#open'));
listener.on('close', () => console.log('listener#close'));
listener.on('error', (err) => console.log('listener#error: %s', err.message));
listener.once('client', () => setInterval(stats.show.bind(stats), 1000));
listener.on('client', function(client)
{
  stats.reset();

  var clientAddress = client.remoteInfo.address;

  if (clientOverflowMap.get(clientAddress) > MAX_BUFFER_OVERFLOWS)
  {
    setTimeout(() => clientOverflowMap.delete(clientAddress), 10000);

    client.destroy();

    return;
  }

  var clientId = ++clientCounter;

  clientIdMap.set(client, clientId);

  console.log('listener#client: %d', clientId);

  client.on('error', err => console.log('client#%d#error: %s', clientId, err.stack));
  client.on('close', () => console.log('client#%d#close', clientId));

  if (DEBUG)
  {
    client.on('data', data => console.log('client#%d#data:', clientId, data));
    client.on('write', data => console.log('client#%d#write:', clientId, data));
  }

  client.on('bufferOverflow', function(buffer)
  {
    const count = (clientOverflowMap.get(clientAddress) || 0) + 1;

    console.log('client#%d#bufferOverflow: count=%d length=%d', clientId, count, buffer.length);

    clientOverflowMap.set(clientAddress, count);

    if (count > MAX_BUFFER_OVERFLOWS)
    {
      setTimeout(() => clientOverflowMap.delete(clientAddress), 10000);

      client.destroy();
    }
  });
});

const slave = new modbus.Slave({
  listener: listener,
  transport: transport,
  requestHandler: handleRequest
});

if (global.gc)
{
  setInterval(global.gc, 60000);
}

slave.on('request', function(e)
{
  if (DEBUG)
  {
    console.log(`slave#request#${clientIdMap.get(e.client)}#${e.adu.unit}#${e.adu.id || 0}: ${e.request}`);
  }

  ++stats.req;
});
slave.on('response', function(e)
{
  if (DEBUG)
  {
    console.log(`slave#response#${clientIdMap.get(e.client)}#${e.adu.unit}: ${e.response}`);
  }

  ++stats.res;
});

const UNIT_TO_DATA = {
  0x01: {
    coils: new Array(0xFFFF),
    discreteInputs: new Array(0xFFFF),
    holdingRegisters: new Buffer(0xFFFF * 2).fill(0),
    inputRegisters: new Buffer(0xFFFF * 2).fill(0)
  }
};
const FUNCTION_CODE_TO_DATA_PROPERTY = {
  [FunctionCode.ReadCoils]: 'coils',
  [FunctionCode.ReadDiscreteInputs]: 'discreteInputs',
  [FunctionCode.ReadHoldingRegisters]: 'holdingRegisters',
  [FunctionCode.ReadInputRegisters]: 'inputRegisters',
  [FunctionCode.WriteSingleCoil]: 'coils',
  [FunctionCode.WriteSingleRegister]: 'holdingRegisters',
  [FunctionCode.WriteMultipleCoils]: 'coils',
  [FunctionCode.WriteMultipleRegisters]: 'holdingRegisters'
};
const FUNCTION_CODE_TO_DATA_HANDLER = {
  [FunctionCode.ReadCoils]: handleReadCoilsRequest,
  [FunctionCode.ReadDiscreteInputs]: handleReadDiscreteInputsRequest,
  [FunctionCode.ReadHoldingRegisters]: handleReadHoldingRegistersRequest,
  [FunctionCode.ReadInputRegisters]: handleReadInputRegistersRequest,
  [FunctionCode.WriteSingleCoil]: handleWriteSingleCoilRequest,
  [FunctionCode.WriteSingleRegister]: handleWriteSingleRegisterRequest,
  [FunctionCode.WriteMultipleCoils]: handleWriteMultipleCoilsRequest,
  [FunctionCode.WriteMultipleRegisters]: handleWriteMultipleRegistersRequest
};

setInterval(function()
{
  UNIT_TO_DATA[0x01].coils[0] = Math.round(Math.random() * 0xFF);
}, 100);
setInterval(function()
{
  UNIT_TO_DATA[0x01].coils[1] = Math.random() > 0.5 ? 0xFF : 0x00;
}, 50);
setInterval(function()
{
  UNIT_TO_DATA[0x01].coils[2] = ([0, 1, 2, 4, 8, 16, 32, 64, 128])[Math.round(Math.random() * 9)];
}, 33);

/**
 * @param {number} unit
 * @param {Request} request
 * @param {respondCallback} respond
 */
function handleRequest(unit, request, respond)
{
  const unitData = UNIT_TO_DATA[unit];

  if (unitData)
  {
    handleUnitRequest(unit, request, unitData, function(result)
    {
      if (DELAY)
      {
        setTimeout(respond, DELAY, result);
      }
      else
      {
        respond(result);
      }
    });
  }
  else
  {
    respond(ExceptionCode.IllegalDataAddress);
  }
}

/**
 * @param {number} unit
 * @param {Request} request
 * @param {UnitData} unitData
 * @param {respondCallback} respond
 */
function handleUnitRequest(unit, request, unitData, respond)
{
  if (FUNCTION_CODE_TO_DATA_PROPERTY[request.functionCode])
  {
    handleReadWriteRequest(unit, request, unitData, respond);
  }
  else
  {
    handleCommandRequest(unit, request, unitData, respond);
  }
}

/**
 * @param {number} unit
 * @param {Request} request
 * @param {UnitData} unitData
 * @param {respondCallback} respond
 */
function handleCommandRequest(unit, request, unitData, respond)
{
  respond(ExceptionCode.IllegalFunctionCode);
}

/**
 * @param {number} unit
 * @param {Request} request
 * @param {UnitData} unitData
 * @param {respondCallback} respond
 */
function handleReadWriteRequest(unit, request, unitData, respond)
{
  const functionData = unitData[FUNCTION_CODE_TO_DATA_PROPERTY[request.functionCode]] || null;

  if (functionData === null)
  {
    respond(ExceptionCode.IllegalFunctionCode);
  }
  else
  {
    FUNCTION_CODE_TO_DATA_HANDLER[request.functionCode](unit, request, functionData, respond);
  }
}

/**
 * @param {(ReadCoilsRequest|ReadDiscreteInputsRequest)} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleReadStatesRequest(request, functionData, respond)
{
  handleReadBufferRequest(
    functionData,
    b => { return {states: modbus.helpers.toBitArray(b, 0, request.quantity)}; },
    request.startingAddress,
    request.endingAddress,
    respond
  );
}

/**
 * @param {(ReadHoldingRegistersRequest|ReadInputRegistersRequest)} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleReadRegisterRequest(request, functionData, respond)
{
  handleReadBufferRequest(
    functionData,
    b => { return {data: b}; },
    request.startingIndex,
    request.endingIndex,
    respond
  );
}

/**
 * @param {Buffer} functionData
 * @param {function(Buffer): Object} prepareResult
 * @param {number} startIndex
 * @param {number} endIndex
 * @param {respondCallback} respond
 */
function handleReadBufferRequest(functionData, prepareResult, startIndex, endIndex, respond)
{
  if (startIndex >= functionData.length || endIndex > functionData.length)
  {
    respond(ExceptionCode.IllegalDataAddress);
  }
  else
  {
    respond(prepareResult(functionData.slice(startIndex, endIndex)));
  }
}

/**
 * @param {number} unit
 * @param {ReadCoilsRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleReadCoilsRequest(unit, request, functionData, respond)
{
  handleReadStatesRequest(request, functionData, respond);
}

/**
 * @param {number} unit
 * @param {ReadDiscreteInputsRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleReadDiscreteInputsRequest(unit, request, functionData, respond)
{
  handleReadStatesRequest(request, functionData, respond);
}

/**
 * @param {number} unit
 * @param {ReadHoldingRegistersRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleReadHoldingRegistersRequest(unit, request, functionData, respond)
{
  handleReadRegisterRequest(request, functionData, respond);
}

/**
 * @param {number} unit
 * @param {ReadInputRegistersRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleReadInputRegistersRequest(unit, request, functionData, respond)
{
  handleReadRegisterRequest(request, functionData, respond);
}

/**
 * @param {number} unit
 * @param {WriteSingleCoilRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleWriteSingleCoilRequest(unit, request, functionData, respond)
{
  respond(ExceptionCode.IllegalFunctionCode);
}

/**
 * @param {number} unit
 * @param {WriteSingleRegisterRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleWriteSingleRegisterRequest(unit, request, functionData, respond)
{
  respond(ExceptionCode.IllegalFunctionCode);
}

/**
 * @param {number} unit
 * @param {WriteMultipleCoilsRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleWriteMultipleCoilsRequest(unit, request, functionData, respond)
{
  respond(ExceptionCode.IllegalFunctionCode);
}

/**
 * @param {number} unit
 * @param {WriteMultipleRegistersRequest} request
 * @param {Buffer} functionData
 * @param {respondCallback} respond
 */
function handleWriteMultipleRegistersRequest(unit, request, functionData, respond)
{
  respond(ExceptionCode.IllegalFunctionCode);
}

/**
 * @typedef {object} UnitData
 * @property {?Buffer} coils
 * @property {?Buffer} discreteInputs
 * @property {?Buffer} holdingRegisters
 * @property {?Buffer} inputRegisters
 */
