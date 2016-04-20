// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Connection = require('../Connection');

/** @type {?WebSocket} */
let WebSocket = null;

/**
 * @private
 * @enum {number}
 */
const ReadyState = {
  Connecting: 0,
  Open: 1,
  Closing: 2,
  Closed: 3
};

class WebSocketConnection extends Connection
{
  /**
   * @param {WebSocketConnectionOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:WebSocketConnection, boolean)}
     */
    this.onSocketOpen = this.onSocketOpen.bind(this);

    /**
     * @private
     * @type {function(this:WebSocketConnection)}
     */
    this.onSocketClose = this.onSocketClose.bind(this);

    /**
     * @private
     * @type {function(this:WebSocketConnection, Error)}
     */
    this.onSocketError = this.onSocketError.bind(this);

    /**
     * @private
     * @type {function(this:WebSocketConnection, (string|Buffer), Object)}
     */
    this.onSocketMessage = this.onSocketMessage.bind(this);

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {WebSocketSocketOptions}
     */
    this.socketOptions = Object.assign({url: 'ws://localhost:502/'}, options.socketOptions);

    /**
     * @private
     * @type {?function(): WebSocket}
     */
    this.socketFactory = null;

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
    this.connected = this.socket.readyState === ReadyState.Open;

    /**
     * @private
     * @type {boolean}
     */
    this.connecting = this.socket.readyState === ReadyState.Connecting;

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

    /**
     * @private
     */
    this.sendOptions = {
      binary: true,
      mask: !!options.mask,
      compress: !!options.compress
    };

    if (this.isOpen())
    {
      this.onSocketOpen(true);
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
    this.destroySocket(this.suppressErrorsAfterDestroy, this.closeOnDestroy);

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

    this.socket = this.setUpSocket(this.socketFactory ? this.socketFactory() : null);
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
      this.socket.send(data, this.sendOptions);
    }
    catch (err)
    {
      this.emit('error', err);
    }
  }

  /**
   * @private
   * @param {(WebSocket|function(): WebSocket)} [webSocket]
   * @returns {WebSocket}
   */
  setUpSocket(webSocket)
  {
    if (!webSocket)
    {
      if (!WebSocket)
      {
        WebSocket = require('ws');
      }

      const options = Object.assign({}, this.socketOptions);

      if (typeof options.agent === 'function')
      {
        options.agent = options.agent();
      }

      webSocket = new WebSocket(options.url, null, options);
    }
    else if (typeof webSocket === 'function')
    {
      this.socketFactory = webSocket;
      webSocket = webSocket();
    }

    webSocket.on('open', this.onSocketOpen);
    webSocket.on('close', this.onSocketClose);
    webSocket.on('error', this.onSocketError);
    webSocket.on('message', this.onSocketMessage);

    return webSocket;
  }

  /**
   * @private
   * @param {boolean} suppressErrors
   * @param {boolean} terminate
   */
  destroySocket(suppressErrors, terminate)
  {
    const socket = this.socket;

    if (socket === null)
    {
      return;
    }

    this.socket = null;

    socket.removeListener('open', this.onSocketOpen);
    socket.removeListener('close', this.onSocketClose);
    socket.removeListener('error', this.onSocketError);
    socket.removeListener('message', this.onSocketMessage);

    if (suppressErrors)
    {
      socket.on('error', () => {});
    }

    if (terminate)
    {
      socket.terminate();
    }
  }

  /**
   * @private
   * @param {boolean} [doNotEmit]
   */
  onSocketOpen(doNotEmit)
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

    this.destroySocket(false, false);
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
   * @param {(string|Buffer)} data
   * @param {{binary: boolean, masked: boolean}} flags
   */
  onSocketMessage(data, flags)
  {
    if (flags.binary)
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
      this.socket.terminate();
    }
  }
}

module.exports = WebSocketConnection;

/**
 * @typedef {Object} WebSocketConnectionOptions
 * @property {(WebSocket|function(): WebSocket)} [socket]
 * @property {WebSocketSocketOptions} [socketOptions]
 * @property {boolean} [mask=false]
 * @property {boolean} [compress=false]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [autoReconnect=true]
 * @property {number} [minConnectTime=2500]
 * @property {number} [maxReconnectTime=5000]
 * @property {number} [noActivityTime=0]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} WebSocketSocketOptions
 * @property {string} [url=ws://localhost:502/]
 * @property {string} [origin]
 * @property {(number|string)} [protocolVersion=13]
 * @property {string} [host]
 * @property {Object} [headers]
 * @property {string} [protocol]
 * @property {(boolean|Object)} [perMessageDeflate]
 * @property {(Agent|function(): Agent)} [agent]
 * @property {string} [localAddress]
 * @property {(string|Buffer)} [pfx]
 * @property {(string|Buffer)} [key]
 * @property {string} [passphrase]
 * @property {(string|Buffer|Array<string>|Array<Buffer>)} [cert]
 * @property {(string|Buffer|Array<string>|Array<Buffer>)} [ca]
 * @property {string} [ciphers]
 * @property {boolean} [rejectUnauthorized]
 */
