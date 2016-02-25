// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Server = require('net').Server;
const Listener = require('../Listener');
const RemoteClient = require('../RemoteClient');

class TcpListener extends Listener
{
  /**
   * @param {TcpListenerOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:TcpListener): void}
     */
    this.onServerListening = this.onServerListening.bind(this);

    /**
     * @private
     * @type {function(this:TcpListener): void}
     */
    this.onServerClose = this.onServerClose.bind(this);

    /**
     * @private
     * @type {function(this:TcpListener, Error): void}
     */
    this.onServerError = this.onServerError.bind(this);

    /**
     * @private
     * @type {function(this:TcpListener, Socket): void}
     */
    this.onServerConnection = this.onServerConnection.bind(this);

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {TcpServerOptions}
     */
    this.serverOptions = Object.assign({port: 502}, options.serverOptions);

    /**
     * @private
     * @type {?Server}
     */
    this.server = this.setUpServer(options.server);

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
     * @type {Map<Socket, TcpSocketListeners>}
     */
    this.socketListeners = new Map();

    /**
     * @private
     * @type {Map<Socket, RemoteClient>}
     */
    this.clients = new Map();

    if (options.autoOpen !== false)
    {
      this.open();
    }
  }

  destroy()
  {
    this.removeAllListeners();
    this.destroyClients();
    this.destroyServer();
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    /* eslint-disable no-underscore-dangle */

    if (this.server === null)
    {
      return false;
    }

    if (typeof this.server.listening === 'boolean')
    {
      return this.server.listening;
    }

    if (typeof this.server._handle !== 'undefined')
    {
      return !!this.server._handle;
    }

    /* eslint-enable no-underscore-dangle */

    return true;
  }

  /**
   * @returns {boolean}
   */
  isOpening()
  {
    if (this.server === null)
    {
      return false;
    }

    if (this.isOpen())
    {
      return false;
    }

    return this.server._handle && this.server._handle.owner === this.server; // eslint-disable-line no-underscore-dangle
  }

  open()
  {
    if (this.isOpen() || this.isOpening())
    {
      return;
    }

    if (this.server === null)
    {
      this.server = this.setUpServer(null);
    }

    this.server.listen(this.serverOptions);
  }

  close()
  {
    if (this.server !== null)
    {
      this.destroyClients();
      this.server.close();
    }
  }

  /**
   * @private
   * @param {Server} server
   * @returns {Server}
   */
  setUpServer(server)
  {
    if (!server)
    {
      server = new Server(this.serverOptions);
    }

    server.on('listening', this.onServerListening);
    server.on('close', this.onServerClose);
    server.on('error', this.onServerError);
    server.on('connection', this.onServerConnection);

    return server;
  }

  /**
   * @private
   */
  destroyServer()
  {
    const server = this.server;

    if (server === null)
    {
      return;
    }

    this.server = null;

    server.removeListener('listening', this.onServerListening);
    server.removeListener('close', this.onServerClose);
    server.removeListener('error', this.onServerError);
    server.removeListener('connection', this.onServerConnection);

    if (this.suppressErrorsAfterDestroy)
    {
      server.on('error', () => {});
    }

    if (this.closeOnDestroy)
    {
      server.close();
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
   * @param {Socket} socket
   */
  setUpClient(socket)
  {
    const client = new RemoteClient({
      address: socket.remoteAddress,
      port: socket.remotePort,
      family: socket.remoteFamily
    });

    client.on('close', this.onClientClose.bind(this, socket));
    client.on('write', this.onClientWrite.bind(this, socket));

    const socketListeners = {
      close: client.destroy.bind(client),
      error: client.emit.bind(client, 'error'),
      readable: function()
      {
        const data = socket.read();

        if (data !== null)
        {
          client.emit('data', data);
        }
      }
    };

    socket.on('close', socketListeners.close);
    socket.on('error', socketListeners.error);
    socket.on('readable', socketListeners.readable);
    socket.setNoDelay(this.serverOptions.noDelay !== false);

    this.socketListeners.set(socket, socketListeners);
    this.clients.set(socket, client);

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
      socket.write(data);
    }
    catch (err)
    {
      client.emit('error', err);
    }
  }

  /**
   * @private
   * @param {Socket} socket
   */
  onClientClose(socket)
  {
    const client = this.clients.get(socket);

    if (!client)
    {
      return;
    }

    const socketListeners = this.socketListeners.get(socket);

    socket.removeListener('close', socketListeners.close);
    socket.removeListener('error', socketListeners.error);
    socket.removeListener('readable', socketListeners.readable);

    if (this.suppressErrorsAfterDestroy)
    {
      socket.on('error', () => {});
    }

    socket.destroy();

    this.socketListeners.delete(socket);
    this.clients.delete(socket);
  }
}

module.exports = TcpListener;

/**
 * @typedef {Object} TcpListenerOptions
 * @property {Server} [server]
 * @property {TcpServerOptions} [serverOptions]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} TcpServerOptions
 * @property {number} [port=502]
 * @property {number} [host=localhost]
 * @property {number} [backlog]
 * @property {string} [path]
 * @property {boolean} [exclusive=false]
 * @property {boolean} [allowHalfOpen=false]
 * @property {boolean} [pauseOnConnect=false]
 * @property {boolean} [noDelay=true]
 */

/**
 * @typedef {Object} TcpSocketListeners
 * @property {function(): void} close
 * @property {function(Error): void} error
 * @property {function(): void} readable
 */

/**
 * @typedef {Object} TcpRemoteClientInfo
 * @property {string} address
 * @property {number} port
 * @property {string} family
 */
