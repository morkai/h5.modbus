var util = require('util');
var net = require('net');
var Connection = require('../Connection');

module.exports = TcpConnection;

/**
 * @name h5.modbus.connections.TcpConnection
 * @constructor
 * @extends {h5.modbus.Connection}
 * @param {(h5.modbus.connections.TcpConnection.Options|object)=} options
 * @event open
 * @event close
 * @event error
 * @event data
 */
function TcpConnection(options)
{
  Connection.call(this);

  /**
   * @private
   * @type {h5.modbus.connections.TcpConnection.Options}
   */
  this.options = options instanceof TcpConnection.Options
    ? options
    : new TcpConnection.Options(options);

  /**
   * @private
   * @type {net.Socket}
   */
  this.socket = this.setUpSocket();

  /**
   * @private
   * @type {boolean}
   */
  this.connected = false;

  /**
   * @private
   * @type {boolean}
   */
  this.connecting = false;

  /**
   * @private
   * @type {boolean}
   */
  this.shouldReconnect = true;

  /**
   * @private
   * @type {number|null}
   */
  this.reconnectTimer = null;

  /**
   * @private
   * @type {number|null}
   */
  this.minConnectTimeTimer = null;

  /**
   * @private
   * @type {number}
   */
  this.connectionAttempts = 0;

  if (this.options.autoReconnect)
  {
    this.setUpReconnectHandler();
  }

  if (this.options.autoConnect)
  {
    this.connect();
  }
}

util.inherits(TcpConnection, Connection);

/**
 * @name h5.modbus.connections.TcpConnection.Options
 * @constructor
 * @param {object=} options
 * @param {net.Socket=} options.socket
 * @param {string=} options.host
 * @param {number=} options.port
 * @param {boolean=} options.autoConnect
 * @param {boolean=} options.autoReconnect
 * @param {number=} options.minConnectTime
 * @param {number=} options.maxReconnectTime
 */
TcpConnection.Options = function(options)
{
  if (options === null || typeof options !== 'object')
  {
    options = {};
  }

  this.socket = options.socket instanceof net.Socket
    ? options.socket
    : new net.Socket();

  /**
   * @type {string}
   */
  this.host = typeof options.host === 'string' ? options.host : '127.0.0.1';

  /**
   * @type {number}
   */
  this.port = typeof options.port === 'number' ? options.port : 502;

  /**
   * @type {boolean}
   */
  this.autoConnect = typeof options.autoConnect === 'boolean'
    ? options.autoConnect
    : true;

  /**
   * @type {boolean}
   */
  this.autoReconnect = typeof options.autoConnect === 'boolean'
    ? options.autoConnect
    : true;

  /**
   * @type {number}
   */
  this.minConnectTime = typeof options.minConnectTime === 'number'
    ? options.minConnectTime
    : 2500;

  /**
   * @type {number}
   */
  this.maxReconnectTime = typeof options.maxReconnectTime === 'number'
    ? options.maxReconnectTime
    : 5000;
};

TcpConnection.prototype.connect = function()
{
  if (this.connected || this.connecting)
  {
    return;
  }

  clearTimeout(this.reconnectTimer);
  this.reconnectTimer = null;

  this.connecting = true;
  this.shouldReconnect = true;
  this.connectionAttempts += 1;

  this.socket.connect(this.options.port, this.options.host);
};

TcpConnection.prototype.close = function()
{
  if (!this.connected)
  {
    return;
  }

  this.shouldReconnect = false;

  this.socket.destroy();
};

/**
 * @param {Buffer} data
 */
TcpConnection.prototype.write = function(data)
{
  if (!this.connected)
  {
    return;
  }

  try
  {
    this.socket.write(data);
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @return {net.Socket}
 */
TcpConnection.prototype.setUpSocket = function()
{
  this.onSocketConnect = this.onSocketConnect.bind(this);
  this.onSocketClose = this.onSocketClose.bind(this);
  this.onSocketError = this.onSocketError.bind(this);
  this.onSocketData = this.onSocketData.bind(this);

  var socket = this.options.socket;

  socket.setNoDelay(true);
  socket.on('connect', this.onSocketConnect);
  socket.on('close', this.onSocketClose);
  socket.on('error', this.onSocketError);
  socket.on('data', this.onSocketData);

  return socket;
};

/**
 * @private
 */
TcpConnection.prototype.onSocketConnect = function()
{
  this.connecting = false;
  this.connected = true;

  clearTimeout(this.minConnectTimeTimer);

  var connection = this;

  this.minConnectTimeTimer = setTimeout(
    function()
    {
      connection.connectionAttempts = 0;
      connection.minConnectTimeTimer = null;
    },
    this.options.minConnectTime
  );

  this.emit('open');
};

/**
 * @private
 */
TcpConnection.prototype.onSocketClose = function()
{
  clearTimeout(this.minConnectTimeTimer);
  this.minConnectTimeTimer = null;

  this.connecting = false;
  this.connected = false;

  this.emit('close');
};

/**
 * @private
 * @param {Error} error
 */
TcpConnection.prototype.onSocketError = function(error)
{
  this.emit('error', error);
};

/**
 * @private
 * @param {Buffer} data
 */
TcpConnection.prototype.onSocketData = function(data)
{
  this.emit('data', data);
};

/**
 * @private
 */
TcpConnection.prototype.setUpReconnectHandler = function()
{
  var connection = this;

  this.on('close', function()
  {
    if (connection.shouldReconnect)
    {
      var reconnectTime = 250 * connection.connectionAttempts;

      if (reconnectTime > connection.options.maxReconnectTime)
      {
        reconnectTime = connection.options.maxReconnectTime;
      }

      connection.reconnectTimer = setTimeout(
        connection.connect.bind(connection), reconnectTime
      );
    }
  });
};
