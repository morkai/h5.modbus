// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const Listener = require('../Listener');
const RemoteClient = require('../RemoteClient');

require('./monkeyPatch');

/** @type {?WebSocketServer} */
let WebSocketServer = null;

class WebSocketListener extends Listener
{
  /**
   * @param {WebSocketListenerOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:WebSocketListener): void}
     */
    this.onServerListening = this.onServerListening.bind(this);

    /**
     * @private
     * @type {function(this:WebSocketListener): void}
     */
    this.onServerClose = this.onServerClose.bind(this);

    /**
     * @private
     * @type {function(this:WebSocketListener, Error): void}
     */
    this.onServerError = this.onServerError.bind(this);

    /**
     * @private
     * @type {function(this:WebSocketListener, Socket): void}
     */
    this.onServerConnection = this.onServerConnection.bind(this);

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {WebSocketServerOptions}
     */
    this.serverOptions = Object.assign({port: 502}, options.serverOptions);

    /**
     * @private
     * @type {?Server}
     */
    this.httpServer = null;

    /**
     * @private
     * @type {?WebSocketServer}
     */
    this.wsServer = null;

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
     * @type {Map<Socket, WebSocketServerListeners>}
     */
    this.socketListeners = new Map();

    /**
     * @private
     * @type {Map<Socket, WebSocketRemoteClient>}
     */
    this.clients = new Map();

    this.setUpServers(options.server);

    if (options.autoOpen !== false)
    {
      this.open();
    }
  }

  destroy()
  {
    this.removeAllListeners();
    this.destroyClients();
    this.destroyServers();
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    /* eslint-disable no-underscore-dangle */

    if (this.httpServer === null)
    {
      return false;
    }

    if (typeof this.httpServer.listening === 'boolean')
    {
      return this.httpServer.listening;
    }

    if (typeof this.httpServer._handle !== 'undefined')
    {
      return !!this.httpServer._handle;
    }

    /* eslint-enable no-underscore-dangle */

    return true;
  }

  /**
   * @returns {boolean}
   */
  isOpening()
  {
    return this.httpServer !== null && !!this.httpServer.binding;
  }

  open()
  {
    if (this.isOpen() || this.isOpening())
    {
      return;
    }

    if (this.httpServer === null)
    {
      this.setUpServers(null);
    }

    this.httpServer.listen(this.serverOptions);
  }

  close()
  {
    if (this.wsServer !== null)
    {
      this.destroyClients();
      this.wsServer.close();
    }
  }

  /**
   * @private
   * @param {?WebSocketServer} wsServer
   */
  setUpServers(wsServer)
  {
    let httpServer = null;

    if (wsServer)
    {
      httpServer = wsServer._server; // eslint-disable-line no-underscore-dangle
    }
    else
    {
      const options = this.serverOptions;

      if (options.server)
      {
        httpServer = options.server;
      }
      else
      {
        httpServer = this.createHttpServer(options);
      }

      if (!WebSocketServer)
      {
        WebSocketServer = require('ws').Server;
      }

      wsServer = new WebSocketServer({
        server: httpServer,
        path: options.path,
        verifyClient: options.verifyClient,
        handleProtocols: options.handleProtocols,
        perMessageDeflate: options.perMessageDeflate,
        maxPayload: options.maxPayload,
        disableHixie: true,
        clientTracking: false
      });
    }

    httpServer.on('listening', this.onServerListening);
    httpServer.on('close', this.onServerClose);
    wsServer.on('error', this.onServerError);
    wsServer.on('connection', this.onServerConnection);

    this.wsServer = wsServer;
    this.httpServer = httpServer;
  }

  createHttpServer(options)
  {
    if (!options.key || !options.cert || !options.pfx)
    {
      return http.createServer();
    }

    const fileRe = /\.(pem|crt|pfx)$/;

    ['key', 'cert', 'pfx'].forEach(option =>
    {
      const value = options[option];

      if (typeof value === 'string' && fileRe.test(value))
      {
        options[option] = fs.readFileSync(value);
      }
    });

    return https.createServer(options);
  }

  /**
   * @private
   */
  destroyServers()
  {
    const wsServer = this.wsServer;

    if (wsServer === null)
    {
      return;
    }

    const httpServer = this.httpServer;

    this.wsServer = null;
    this.httpServer = null;

    httpServer.removeListener('listening', this.onServerListening);
    httpServer.removeListener('close', this.onServerClose);
    wsServer.removeListener('error', this.onServerError);
    wsServer.removeListener('connection', this.onServerConnection);

    if (this.suppressErrorsAfterDestroy)
    {
      wsServer.on('error', () => {});
      httpServer.on('error', () => {});
    }

    if (this.closeOnDestroy)
    {
      wsServer.close();
      httpServer.close();
    }
  }

  /**
   * @private
   */
  onServerListening()
  {
    this.emit('open');
  }

  /**
   * @private
   */
  onServerClose()
  {
    this.destroyClients();
    this.emit('close');
  }

  /**
   * @private
   * @param {Error} err
   */
  onServerError(err)
  {
    this.emit('error', err);
  }

  /**
   * @private
   * @param {Socket} socket
   */
  onServerConnection(socket)
  {
    this.setUpClient(socket);
  }

  /**
   * @private
   * @param {WebSocket} webSocket
   */
  setUpClient(webSocket)
  {
    const tcpSocket = webSocket.upgradeReq.socket;
    const client = new WebSocketRemoteClient({
      address: tcpSocket.remoteAddress,
      port: tcpSocket.remotePort,
      family: tcpSocket.remoteFamily
    });

    client.on('close', this.onClientClose.bind(this, webSocket));
    client.on('write', this.onClientWrite.bind(this, webSocket));

    const socketListeners = {
      close: client.destroy.bind(client),
      error: client.emit.bind(client, 'error'),
      message: function(data, flags)
      {
        if (flags.binary)
        {
          client.masked = flags.masked;
          client.emit('data', data);
        }
      }
    };

    webSocket.on('close', socketListeners.close);
    webSocket.on('error', socketListeners.error);
    webSocket.on('message', socketListeners.message);

    this.socketListeners.set(webSocket, socketListeners);
    this.clients.set(webSocket, client);

    this.emit('client', client);
  }

  /**
   * @private
   */
  destroyClients()
  {
    this.clients.forEach(client => client.destroy());
  }

  /**
   * @private
   * @param {Socket} socket
   * @param {Buffer} data
   */
  onClientWrite(socket, data)
  {
    const client = this.clients.get(socket);

    if (!client)
    {
      return;
    }

    try
    {
      socket.send(data, {binary: true, mask: client.masked});
    }
    catch (err)
    {
      client.emit('error', err);
    }
  }

  /**
   * @private
   * @param {WebSocket} webSocket
   */
  onClientClose(webSocket)
  {
    const client = this.clients.get(webSocket);

    if (!client)
    {
      return;
    }

    const socketListeners = this.socketListeners.get(webSocket);

    webSocket.removeListener('close', socketListeners.close);
    webSocket.removeListener('error', socketListeners.error);
    webSocket.removeListener('message', socketListeners.message);

    if (this.suppressErrorsAfterDestroy)
    {
      webSocket.on('error', () => {});
    }

    webSocket.terminate();

    this.socketListeners.delete(webSocket);
    this.clients.delete(webSocket);
  }
}

/**
 * @private
 */
class WebSocketRemoteClient extends RemoteClient
{
  /**
   * @param {TcpRemoteClientInfo} remoteInfo
   */
  constructor(remoteInfo)
  {
    super(remoteInfo);

    /**
     * @type {boolean}
     */
    this.masked = true;
  }
}

module.exports = WebSocketListener;

/**
 * @typedef {Object} WebSocketListenerOptions
 * @property {WebSocketServer} [server]
 * @property {WebSocketServerOptions} [serverOptions]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} WebSocketServerOptions
 * @property {Server} [server]
 * @property {number} [port=80]
 * @property {number} [host=0.0.0.0]
 * @property {string} [path]
 * @property {(string|Buffer)} [pfx]
 * @property {(string|Buffer)} [key]
 * @property {string} [passphrase]
 * @property {(string|Buffer|Array<string>|Array<Buffer>)} [cert]
 * @property {(string|Buffer|Array<string>|Array<Buffer>)} [ca]
 * @property {string} [ciphers]
 * @property {boolean} [rejectUnauthorized]
 * @property {function(Object, function(boolean, number, string))} [verifyClient]
 * @property {function(Array<string>, function(boolean, string))} [handleProtocols]
 * @property {(boolean|Object)} [perMessageDeflate]
 * @property {number} [maxPayload]
 */

/**
 * @typedef {Object} WebSocketServerListeners
 * @property {function(): void} close
 * @property {function(Error): void} error
 * @property {function((string|Buffer), {{binary: boolean, masked: boolean}}): void} message
 */
