'use strict';

var util = require('util');
var net = require('net');
var Connection = require('../Connection');

module.exports = TcpConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {TcpConnection.Options|object} [options]
 * @event open Alias to the `connect` event of the underlying `net.Socket`.
 * @event close Alias to the `close` event of the underlying `net.Socket`.
 * @event error Emitted when the underlying `net.Socket` emits the `error`
 * event or its `write()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `net.Socket` (even if the connection is closed).
 * @event data Alias to the `data` event of the underlying `net.Socket`.
 */
function TcpConnection(options)
{
  Connection.call(this);

  /**
   * @private
   * @type {TcpConnection.Options}
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
  this.shouldReconnect = this.options.autoReconnect;

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

  /**
   * @private
   * @type {number}
   */
  this.lastDataEventTime = 0;

  /**
   * @private
   * @type {number|null}
   */
  this.noActivityTimeTimer = null;

  if (this.options.autoConnect)
  {
    this.connect();
  }
}

util.inherits(TcpConnection, Connection);

/**
 * @constructor
 * @param {object} [options]
 * @param {net.Socket} [options.socket]
 * @param {string} [options.host]
 * @param {number} [options.port]
 * @param {boolean} [options.autoConnect]
 * @param {boolean} [options.autoReconnect]
 * @param {number} [options.minConnectTime]
 * @param {number} [options.maxReconnectTime]
 * @param {number} [options.noActivityTime]
 */
TcpConnection.Options = function(options)
{
  if (options === null || typeof options !== 'object')
  {
    options = {};
  }

  /**
   * @type {net.Socket}
   */
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
  this.autoReconnect = typeof options.autoReconnect === 'boolean'
    ? options.autoReconnect
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

  /**
   * @type {number}
   */
  this.noActivityTime = typeof options.noActivityTime === 'number'
    ? options.noActivityTime
    : -1;
};

TcpConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.destroy();
    this.socket = null;
  }

  if (this.reconnectTimer !== null)
  {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  if (this.minConnectTimeTimer !== null)
  {
    clearTimeout(this.minConnectTimeTimer);
    this.minConnectTimeTimer = null;
  }

  if (this.noActivityTimeTimer !== null)
  {
    clearInterval(this.noActivityTimeTimer);
    this.noActivityTimeTimer = null;
  }
};

/**
 * @returns {boolean}
 */
TcpConnection.prototype.isOpen = function()
{
  return this.connected;
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
  this.shouldReconnect = this.options.autoReconnect;
  this.connectionAttempts += 1;

  this.socket.connect(this.options.port, this.options.host);
};

TcpConnection.prototype.close = function()
{
  this.doClose(false);
};

/**
 * @param {Buffer} data
 */
TcpConnection.prototype.write = function(data)
{
  this.emit('write', data);

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
 * @param {boolean} shouldReconnect
 */
TcpConnection.prototype.doClose = function(shouldReconnect)
{
  this.shouldReconnect = shouldReconnect;

  if (this.reconnectTimer !== null)
  {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  this.socket.destroy();
};

/**
 * @private
 * @returns {net.Socket}
 */
TcpConnection.prototype.setUpSocket = function()
{
  this.onSocketConnect = this.onSocketConnect.bind(this);
  this.onSocketClose = this.onSocketClose.bind(this);
  this.onSocketReadable = this.onSocketReadable.bind(this);

  var socket = this.options.socket;

  socket.setNoDelay(true);
  socket.on('connect', this.onSocketConnect);
  socket.on('close', this.onSocketClose);
  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('readable', this.onSocketReadable);

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

      connection.setUpNoActivityTimer();
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

  if (this.noActivityTimeTimer !== null)
  {
    clearInterval(this.noActivityTimeTimer);
    this.noActivityTimeTimer = null;
  }

  this.connecting = false;
  this.connected = false;

  this.handleReconnect();

  this.emit('close');
};

/**
 * @private
 */
TcpConnection.prototype.onSocketReadable = function()
{
  var data = this.socket.read();

  if (data !== null)
  {
    this.lastDataEventTime = Date.now();

    this.emit('data', data);
  }
};

/**
 * @private
 */
TcpConnection.prototype.handleReconnect = function()
{
  if (!this.shouldReconnect)
  {
    return;
  }

  var reconnectTime = 250 * this.connectionAttempts;

  if (reconnectTime > this.options.maxReconnectTime)
  {
    reconnectTime = this.options.maxReconnectTime;
  }

  this.reconnectTimer = setTimeout(this.connect.bind(this), reconnectTime);
};

/**
 * @private
 */
TcpConnection.prototype.setUpNoActivityTimer = function()
{
  var noActivityTime = this.options.noActivityTime;

  if (noActivityTime <= 0 || this.noActivityTimeTimer !== null)
  {
    return;
  }

  this.noActivityTimeTimer = setInterval(
    this.checkActivity.bind(this),
    noActivityTime
  );
};

/**
 * @private
 */
TcpConnection.prototype.checkActivity = function()
{
  var lastActivityTime = Date.now() - this.lastDataEventTime;

  if (lastActivityTime > this.options.noActivityTime)
  {
    this.connected = false;

    this.doClose(true);
  }
};
