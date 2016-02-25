// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

//
// The most useful:
//

/** @type {function(new:Master, MasterOptions)} */
exports.Master = require('./Master');

/** @type {function(new:Slave, SlaveOptions)} */
exports.Slave = require('./Slave');

/** @type {typeof ExceptionCode} */
exports.ExceptionCode = require('./ExceptionCode');

/** @type {typeof FunctionCode} */
exports.FunctionCode = require('./FunctionCode');

//
// Needed for custom implementations:
//

exports.helpers = require('./helpers');

/** @type {function(new:ApplicationDataUnit, ?number, number, Buffer, ?number)} */
exports.ApplicationDataUnit = require('./ApplicationDataUnit');

/** @type {function(new:RemoteClient, Object)} */
exports.RemoteClient = require('./RemoteClient');

/** @type {function(new:Transaction, TransactionOptions)} */
exports.Transaction = require('./Transaction');

/** @type {function(new:InvalidFrameError, string=)} */
exports.InvalidFrameError = require('./InvalidFrameError');

/** @type {function(new:ResponseTimeoutError, string=)} */
exports.ResponseTimeoutError = require('./ResponseTimeoutError');

//
// Transports:
//

/** @type {function(new:Transport)} */
exports.Transport = require('./Transport');

/** @type {function(new:IpTransport, IpTransportOptions)} */
exports.IpTransport = require('./transports/IpTransport');

/** @type {function(new:AsciiTransport, AsciiTransportOptions)} */
exports.AsciiTransport = require('./transports/AsciiTransport');

/** @type {function(new:RtuTransport, RtuTransportOptions)} */
exports.RtuTransport = require('./transports/RtuTransport');

//
// Connections:
//

/** @type {function(new:Connection)} */
exports.Connection = require('./Connection');

/** @type {function(new:TcpConnection, TcpConnectionOptions)} */
exports.TcpConnection = require('./connections/TcpConnection');

/** @type {function(new:UdpConnection, UdpConnectionOptions)} */
exports.UdpConnection = require('./connections/UdpConnection');

/** @type {function(new:SerialConnection, SerialConnectionOptions)} */
exports.SerialConnection = require('./connections/SerialConnection');

//
// Listeners:
//

/** @type {function(new:Listener)} */
exports.Listener = require('./Listener');

/** @type {function(new:TcpListener, TcpListenerOptions)} */
exports.TcpListener = require('./listeners/TcpListener');

/** @type {function(new:UdpListener, UdpListenerOptions)} */
exports.UdpListener = require('./listeners/UdpListener');

/** @type {function(new:SerialListener, SerialListenerOptions)} */
exports.SerialListener = require('./listeners/SerialListener');

//
// Messages:
//

const messages = require('./messages');

/** @type {function(new:Message, number)} */
exports.Message = require('./Message');

/** @type {function(new:Request, number)} */
exports.Request = require('./Request');

/** @type {function(new:Response, number)} */
exports.Response = require('./Response');

/** @type {Object<FunctionCode, typeof Request>} */
exports.requests = messages.requests;

/** @type {Object<FunctionCode, typeof Response>} */
exports.responses = messages.responses;

/** @type {function(new:ReadDiscreteInputsRequest, number, number)} */
exports.ReadDiscreteInputsRequest = messages.ReadDiscreteInputsRequest;

/** @type {function(new:ReadDiscreteInputsResponse, Array<boolean>)} */
exports.ReadDiscreteInputsResponse = messages.ReadDiscreteInputsResponse;

/** @type {function(new:ReadCoilsRequest, number, number)} */
exports.ReadCoilsRequest = messages.ReadCoilsRequest;

/** @type {function(new:ReadCoilsResponse, Array<boolean>)} */
exports.ReadCoilsResponse = messages.ReadCoilsResponse;

/** @type {function(new:WriteSingleCoilRequest, number, boolean)} */
exports.WriteSingleCoilRequest = messages.WriteSingleCoilRequest;

/** @type {function(new:WriteSingleCoilResponse, number, boolean)} */
exports.WriteSingleCoilResponse = messages.WriteSingleCoilResponse;

/** @type {function(new:WriteMultipleCoilsRequest, number, Array<boolean>)} */
exports.WriteMultipleCoilsRequest = messages.WriteMultipleCoilsRequest;

/** @type {function(new:WriteMultipleCoilsResponse, number, number)} */
exports.WriteMultipleCoilsResponse = messages.WriteMultipleCoilsResponse;

/** @type {function(new:ReadInputRegistersRequest, number, number)} */
exports.ReadInputRegistersRequest = messages.ReadInputRegistersRequest;

/** @type {function(new:ReadInputRegistersResponse, Buffer)} */
exports.ReadInputRegistersResponse = messages.ReadInputRegistersResponse;

/** @type {function(new:ReadHoldingRegistersRequest, number, number)} */
exports.ReadHoldingRegistersRequest = messages.ReadHoldingRegistersRequest;

/** @type {function(new:ReadHoldingRegistersResponse, Buffer)} */
exports.ReadHoldingRegistersResponse = messages.ReadHoldingRegistersResponse;

/** @type {function(new:WriteSingleRegisterRequest, number, number)} */
exports.WriteSingleRegisterRequest = messages.WriteSingleRegisterRequest;

/** @type {function(new:WriteSingleRegisterResponse, number, number)} */
exports.WriteSingleRegisterResponse = messages.WriteSingleRegisterResponse;

/** @type {function(new:WriteMultipleRegistersRequest, number, Buffer)} */
exports.WriteMultipleRegistersRequest = messages.WriteMultipleRegistersRequest;

/** @type {function(new:WriteMultipleRegistersResponse, number, number)} */
exports.WriteMultipleRegistersResponse = messages.WriteMultipleRegistersResponse;

/** @type {function(new:ExceptionResponse, FunctionCode, ExceptionCode)} */
exports.ExceptionResponse = messages.ExceptionResponse;

//
// Factories:
//

/**
 * @param {MasterOptions} [options]
 * @returns {Master}
 */
exports.createMaster = function(options)
{
  if (!options)
  {
    options = {};
  }

  if (options.transport && options.transport.type)
  {
    options.transport = exports.createTransport(options.transport);
  }

  if (options.connection && options.connection.type)
  {
    options.connection = exports.createConnection(options.connection);
  }

  return new exports.Master(options);
};

/**
 * @param {SlaveOptions} [options]
 * @returns {Slave}
 */
exports.createSlave = function(options)
{
  if (!options)
  {
    options = {};
  }

  if (options.transport && options.transport.type)
  {
    options.transport = exports.createTransport(options.transport);
  }

  if (options.listener && options.listener.type)
  {
    options.listener = exports.createListener(options.listener);
  }

  return new exports.Slave(options);
};

/**
 * @type {Object<string, typeof Connection>}
 */
exports.connections = {
  tcp: exports.TcpConnection,
  udp: exports.UdpConnection,
  serial: exports.SerialConnection
};

/**
 * @param {string} [type]
 * @param {Object} options
 * @returns {Connection}
 */
exports.createConnection = function(type, options)
{
  return createByType('connection', exports.connections, type, options);
};

/**
 * @type {Object<string, typeof Listener>}
 */
exports.listeners = {
  tcp: exports.TcpListener,
  udp: exports.UdpListener,
  serial: exports.SerialListener
};

/**
 * @param {string} [type]
 * @param {Object} options
 * @returns {Listener}
 */
exports.createListener = function(type, options)
{
  return createByType('listener', exports.listeners, type, options);
};

/**
 * @type {Object<string, typeof Transport>}
 */
exports.transports = {
  ip: exports.IpTransport,
  ascii: exports.AsciiTransport,
  rtu: exports.RtuTransport
};

/**
 * @param {string} [type]
 * @param {Object} options
 * @returns {Transport}
 */
exports.createTransport = function(type, options)
{
  return createByType('transport', exports.transports, type, options);
};

/**
 * @private
 * @param {string} label
 * @param {Object<string, Function>} typeMap
 * @param {?string} type
 * @param {?Object} options
 * @returns {Object}
 */
function createByType(label, typeMap, type, options)
{
  if (type && typeof type === 'object')
  {
    options = type;
    type = options.type;
  }
  else if (!options)
  {
    options = {};
  }

  if (typeof type !== 'string')
  {
    throw new Error(`No ${label} type specified!`);
  }

  const Type = typeMap[type.toLowerCase()];

  if (typeof Type !== 'function')
  {
    throw new Error(`Unknown ${label} type: ${type}.`);
  }

  return typeof Type.fromOptions === 'function'
    ? Type.fromOptions(options)
    : new Type(options);
}
