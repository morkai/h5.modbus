// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Socket = require('net').Socket;
const Connection = require('../Connection');

class TcpConnection extends Connection
{
  /**
   * @param {TcpConnectionOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:TcpConnection)}
     */
    this.onSocketConnect = this.onSocketConnect.bind(this);

    /**
     * @private
     * @type {function(this:TcpConnection)}
     */
    this.onSocketClose = this.onSocketClose.bind(this);

    /**
     * @private
     * @type {function(this:TcpConnection, Error)}
     */
    this.onSocketError = this.onSocketError.bind(this);

    /**
     * @private
     * @type {function(this:TcpConnection)}
     */
    this.onSocketReadable = this.onSocketReadable.bind(this);

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {TcpSocketOptions}
     */
    this.socketOptions = Object.assign({port: 502, host: 'localhost'}, options.socketOptions);

    /**
     * @private
     * @type {?Socket}
     */
    this.socket = this.setUpSocket(options.socket);

    /**
     * @private
     * @type {boolean}
     */
    this.autoReconnect = options.autoReconnect !== false;

    /**
     * @private
     * @type {number}
     */
    this.minConnectTime = options.minConnectTime || 2500;

    /**
     * @private
     * @type {number}
     */
    this.maxReconnectTime = options.maxReconnectTime || 5000;

    /**
     * @private
     * @type {number}
     */
    this.noActivityTime = options.noActivityTime || 0;

    /**
     * @private
     * @type {boolean}
     */
    this.closeOnDestroy = options.closeOnDestroy !== false;

    /**
     * @private
     * @type {boolean}
     */
    this.suppressErrorsAfterDestroy = options.suppressErrorsAfterDestroy !== false;

    /**
     * @private
     * @type {boolean}
     */
    this.connected = this.socket.readyState === 'open';

    /**
     * @private
     * @type {boolean}
     */
    this.connecting = this.socket.readyState === 'opening';

    /**
     * @private
     * @type {boolean}
     */
    this.shouldReconnect = this.autoReconnect;

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
     * @type {?number}
     */
    this.reconnectTimer = null;

    /**
     * @private
     * @type {?number}
     */
    this.minConnectTimeTimer = null;

    /**
     * @private
     * @type {?number}
     */
    this.noActivityTimer = null;

    if (this.isOpen())
    {
      this.onSocketConnect(true);
    }
    else if (this.isOpening())
    {
      this.connectionAttempts += 1;
    }
    else if (options.autoOpen !== false)
    {
      this.open();
    }
  }

  destroy()
  {
    this.removeAllListeners();
    this.destroySocket();

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

    if (this.noActivityTimer !== null)
    {
      clearInterval(this.noActivityTimer);
      this.noActivityTimer = null;
    }
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    return this.connected;
  }

  /**
   * @returns {boolean}
   */
  isOpening()
  {
    return this.connecting;
  }

  open()
  {
    if (this.isOpen() || this.isOpening())
    {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;

    this.connecting = true;
    this.shouldReconnect = this.autoReconnect;
    this.connectionAttempts += 1;

    if (this.socket === null)
    {
      this.socket = this.setUpSocket(null);
    }

    this.socket.connect(this.socketOptions);
  }

  close()
  {
    this.doClose(false);
  }

  /**
   * @param {Buffer} data
   */
  write(data)
  {
    this.emit('write', data);

    if (!this.isOpen())
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
  }

  /**
   * @private
   * @param {Socket} [socket]
   * @returns {Socket}
   */
  setUpSocket(socket)
  {
    if (!socket)
    {
      socket = new Socket();
    }

    socket.on('connect', this.onSocketConnect);
    socket.on('close', this.onSocketClose);
    socket.on('error', this.onSocketError);
    socket.on('readable', this.onSocketReadable);
    socket.setNoDelay(this.socketOptions.noDelay !== false);

    return socket;
  }

  /**
   * @private
   */
  destroySocket()
  {
    const socket = this.socket;

    if (socket === null)
    {
      return;
    }

    this.socket = null;

    socket.removeListener('connect', this.onSocketConnect);
    socket.removeListener('close', this.onSocketClose);
    socket.removeListener('error', this.onSocketError);
    socket.removeListener('readable', this.onSocketReadable);

    if (this.suppressErrorsAfterDestroy)
    {
      socket.on('error', () => {});
    }

    if (this.closeOnDestroy)
    {
      socket.destroy();
    }
  }

  /**
   * @private
   * @param {boolean} [doNotEmit]
   */
  onSocketConnect(doNotEmit)
  {
    this.connecting = false;
    this.connected = true;

    clearTimeout(this.minConnectTimeTimer);

    this.minConnectTimeTimer = setTimeout(this.onAfterMinConnectTime.bind(this), this.minConnectTime);

    if (!doNotEmit)
    {
      this.emit('open');
    }
  }

  /**
   * @private
   */
  onSocketClose()
  {
    if (this.minConnectTimeTimer !== null)
    {
      clearTimeout(this.minConnectTimeTimer);
      this.minConnectTimeTimer = null;
    }

    if (this.noActivityTimer !== null)
    {
      clearInterval(this.noActivityTimer);
      this.noActivityTimer = null;
    }

    this.connecting = false;
    this.connected = false;

    this.reconnect();

    this.emit('close');
  }

  /**
   * @private
   * @param {Error} err
   */
  onSocketError(err)
  {
    this.emit('error', err);
  }

  /**
   * @private
   */
  onSocketReadable()
  {
    var data = this.socket.read();

    if (data !== null)
    {
      this.lastDataEventTime = Date.now();

      this.emit('data', data);
    }
  }

  /**
   * @private
   */
  onAfterMinConnectTime()
  {
    this.connectionAttempts = 0;
    this.minConnectTimeTimer = null;

    this.setUpNoActivityTimer();
  }

  /**
   * @private
   */
  setUpNoActivityTimer()
  {
    if (this.noActivityTime > 0 && this.noActivityTimer === null)
    {
      this.noActivityTimer = setInterval(
        this.checkActivity.bind(this),
        this.noActivityTime
      );
    }
  }

  /**
   * @private
   */
  checkActivity()
  {
    var lastActivityTime = Date.now() - this.lastDataEventTime;

    if (lastActivityTime > this.noActivityTime)
    {
      this.connected = false;

      this.doClose(true);
    }
  }

  /**
   * @private
   */
  reconnect()
  {
    if (!this.shouldReconnect)
    {
      return;
    }

    var reconnectTime = 250 * this.connectionAttempts;

    if (reconnectTime > this.maxReconnectTime)
    {
      reconnectTime = this.maxReconnectTime;
    }

    this.reconnectTimer = setTimeout(this.open.bind(this), reconnectTime);
  }

  /**
   * @private
   * @param {boolean} shouldReconnect
   */
  doClose(shouldReconnect)
  {
    this.shouldReconnect = shouldReconnect;

    if (this.reconnectTimer !== null)
    {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket !== null)
    {
      this.socket.destroy();
    }
  }
}

module.exports = TcpConnection;

/**
 * @typedef {Object} TcpConnectionOptions
 * @property {Socket} [socket]
 * @property {TcpSocketOptions} [socketOptions={host: 'localhost', port: 502}]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [autoReconnect=true]
 * @property {number} [minConnectTime=2500]
 * @property {number} [maxReconnectTime=5000]
 * @property {number} [noActivityTime=0]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} TcpSocketOptions
 * @property {string} [host=localhost]
 * @property {number} [port=502]
 * @property {string} [localAddress]
 * @property {number} [localPort]
 * @property {number} [family=4]
 * @property {function(string, object, function(Error, string, number): void): void} [lookup]
 * @property {string} [path]
 * @property {boolean} [noDelay=true]
 */
