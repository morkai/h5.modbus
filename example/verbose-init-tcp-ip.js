'use strict';

// Verbose example of reading `8` discrete inputs starting from address `0x0000`
// from a MODBUS TCP/IP slave.

var net = require('net');
var TcpConnection = require('../lib/connections/TcpConnection');
var IpTransport = require('../lib/transports/IpTransport');
var functions = require('../lib/functions');
var Transaction = require('../lib/Transaction');
var Master = require('../lib/Master');

var socket = new net.Socket();

// Connection is responsible for sending and receiving MODBUS frames.
// Every Connection is an EventEmitter.
// Available connection types are:
//   - tcp - using node's `net` module,
//   - udp - using node's `dgram` module,
//   - serial - using the `serialport` module.
// All Connections emit the following events: open, close, error, write
// and data.
var connection = new TcpConnection({
  // An instance of net.Socket. Should be specified only if one wants to attach
  // any events to the object.
  socket: socket,
  // IP address or hostname of the MODBUS TCP/IP slave.
  // Defaults to `127.0.0.1`.
  host: '127.0.0.1',
  // Port on which the MODBUS slave is listening for connections.
  // Defaults to `502`.
  port: 502,
  // Whether to connect to the slave immediately. Defaults to `true`.
  // If `false`, one must call the `connect()` method.
  autoConnect: true,
  // Whether the connection should be reestablished after a disconnection.
  // Defaults to `true`.
  autoReconnect: true,
  // Number of milliseconds after which the connection is considered connected
  // and stable. Internal connection attempts counter is reset only after the
  // specified time to prevent flood of connections in cases where the slave
  // accepts a connection and then immediately closes it.
  // Defaults to `2500`.
  minConnectTime: 2500,
  // Maximum number of milliseconds between reconnection attempts. The first
  // reconnection attempt is immediate. Second after 250 ms, third after 500 ms
  // and so on... up to the specified max
  // (i.e. min(250 * (reconnectAttempts - 1), maxReconnectTime)).
  // Defaults to `5000`
  maxReconnectTime: 5000
});

connection.on('open', function()
{
  console.log('[connection#open]');
});

connection.on('close', function()
{
  console.log('[connection#close]');
});

connection.on('error', function(err)
{
  console.log('[connection#error] %s', err.message);
});

connection.on('write', function(data)
{
  console.log('[connection#write]', data);
});

connection.on('data', function(data)
{
  console.log('[connection#data]', data);
});

// Transport is responsible for constructing MODBUS frames from requests,
// deconstructing MODBUS frames to responses and matching these responses to
// the requests.
// Uses a Connection to send and receive data. Any connection type can be
// matched with any transport type.
// Available transport types are:
//   - ip - MODBUS TCP framing, i.e. with ID and without checksum,
//   - ascii - MODBUS ASCII framing, i.e. with ASCII encoding, defined
//     start and end characters and LRC checksum,
//   - rtu - MODBUS RTU framing, i.e. with frames separated by idle
//     periods and CRC checksum.
var transport = new IpTransport(connection);

transport.on('request', function(transaction)
{
  console.log('[transport#request] %s', transaction.getRequest());
});

// Master is responsible for managing and executing transactions.
// Transactions, when executed, are placed in a queue and sent only if a number
// of currently sent requests is less than the `maxConcurrentRequests` option.
var master = new Master({
  // An instance of Transport.
  transport: transport,
  // Whether or not a dummy function should be added to an `error` event
  // of every transaction. Will prevent Node from throwing an exception in case
  // no `error` listeners were registered manually and a request timed out,
  // or resulted in a MODBUS exception. Defaults to `false`.
  suppressTransactionErrors: false,
  // Whether or not to retry a request if a response was returned and was a
  // MODBUS exception (function code > 0x80). Defaults to `true`.
  retryOnException: true,
  // Number of concurrent requests. After reaching the limit, Master will
  // wait until any of the currently sent requests receives a response or times
  // out before sending any more requests. Values higher than `1` make sense
  // only with the `tcp` transport type (because of each frame having a message
  // ID). Defaults to `1`.
  maxConcurrentRequests: 1,
  // If a transaction was created using a plain object and not by instantiating
  // Transaction, then this value will be used if no `unit` property was
  // specified. Defaults to `0`.
  defaultUnit: 0,
  // If a transaction was created using a plain object and not by instantiating
  // Transaction, then this value will be used if no `maxRetries` property was
  // specified. Defaults to `3`.
  defaultMaxRetries: 3,
  // If a transaction was created using a plain object and not by instantiating
  // Transaction, then this value will be used if no `timeout` property was
  // specified. Defaults to `100`.
  defaultTimeout: 100
});

var address = 0x0000;
var quantity = 8;

// Represents a MODBUS request. Required by the Transaction. Used to create
// the PDU (Protocol Data Unit) part of the MODBUS frame.
// Available requests are:
//   - 0x01 ReadCoilsRequest,
//   - 0x02 ReadDiscreteInputsRequest,
//   - 0x03 ReadHoldingRegistersRequest,
//   - 0x04 ReadInputRegistersRequest,
//   - 0x05 WriteSingleCoilRequest,
//   - 0x06 WriteSingleRegisterRequest,
//   - 0x0F WriteMultipleCoilsRequest,
//   - 0x10 WriteMultipleRegistersRequest.
var request1 = new functions.ReadDiscreteInputsRequest(address, quantity);

// Transaction is a Request with additional config options used by Master
// and Transport. Every instance of Transaction is also an EventEmitter.
// The following events can be emitted by every Transaction: `timeout`, `error`,
// `response`, `complete` and `cancel`.
// A new transaction can be created by instantiating the Transaction class or
// calling the `Transaction.fromOptions()` constructor. The following options
// are available: `unit`, `maxRetries`, `timeout`, `interval`.
var transaction1 = new Transaction(request1);

// Sets the unit of the MODBUS slave.
transaction1.setUnit(0);

// Sets the max number of retries because of an error before giving up.
transaction1.setMaxRetries(3);

// Sets the max number of milliseconds to wait for a response from the slave.
transaction1.setTimeout(100);

// Sets a number of milliseconds to wait after the `complete` event before
// automatic execution of the transaction. Setting this option to a value other
// than -1 switches the transaction into repeatable mode. Repeatable
// transaction can be cancelled by calling the `cancel()` method.
// Useful for repeated reads.
transaction1.setInterval(100);

// Emitted when no response was received in a time specified by the `timeout`
// option.
// This event is not emitted if the transaction was cancelled.
transaction1.on('timeout', function()
{
  console.error('[transaction#timeout]');
});

// Emitted after the `timeout` event or when an error occurred related to that
// transaction (e.g. invalid data in a response frame). First argument is
// an instance of `Error` with additional information.
// This event is not emitted if the transaction was cancelled.
transaction1.on('error', function(err)
{
  console.error('[transaction#error] %s', err.message);
});

// Emitted after receiving a valid response from the MODBUS slave.
// A MODBUS exception (function code > 0x80) is considered a valid response
// here. To check whether the response is an exception or response results data
// use the `isException()` method of the `Response` specified as the first
// argument.
// This event is not emitted if the transaction was cancelled.
transaction1.on('response', function(response)
{
  if (response.isException())
  {
    console.error('[transaction#response] %s', response);
  }
  else
  {
    console.log('[transaction#response] %s', response);
  }
});

// Emitted after `error` or `response` event. First argument is an instance of
// `Error` with additional information or `null`. Second argument is an instance
// of `h5.modbus.functions.Response` or `null`. Both arguments cannot be `null`.
// Emitted even if the transaction was cancelled.
transaction1.on('complete', function(err, response)
{
  if (err)
  {
    console.error('[transaction#complete] %s', err.message);
  }
  else
  {
    console.log('[transaction#complete] %s', response);
  }
});

// Emitted after the transaction was cancelled by calling the `cancel()` method.
transaction1.on('cancel', function()
{
  console.log('[transaction#cancel]');
});

// Send requests only if we're connected to the slave.
master.once('connected', function()
{
  // Execute a transaction by providing an instance of `Transaction` or
  // an options object to the `execute()` method or by calling one
  // of the `read*/write*` methods.
  master.execute(transaction1);

  setTimeout(
    function()
    {
      transaction1.cancel();
      master.destroy();
    },
    5000
  );
});
