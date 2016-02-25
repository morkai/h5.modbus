// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const dgram = require('dgram');
const Listener = require('../Listener');
const RemoteClient = require('../RemoteClient');

/**
 * @private
 * @const
 * @type {number}
 */
const BIND_STATE_BINDING = 1;

/**
 * @private
 * @const
 * @type {number}
 */
const BIND_STATE_BOUND = 2;

class UdpListener extends Listener
{
  /**
   * @param {UdpListenerOptions} [options]
   */
  constructor(options)
  {
    super();

    /**
     * @private
     * @type {function(this:UdpListener): void}
     */
    this.onSocketListening = this.onSocketListening.bind(this);

    /**
     * @private
     * @type {function(this:UdpListener): void}
     */
    this.onSocketClose = this.onSocketClose.bind(this);

    /**
     * @private
     * @type {function(this:UdpListener, Error): void}
     */
    this.onSocketError = this.onSocketError.bind(this);

    /**
     * @private
     * @type {function(this:UdpListener, Buffer, Object): void}
     */
    this.onSocketMessage = this.onSocketMessage.bind(this);

    if (!options)
    {
      options = {};
    }

    /**
     * @private
     * @type {UdpServerOptions}
     */
    this.socketOptions = Object.assign({port: 502}, options.socketOptions);

    /**
     * @private
     * @type {?Socket}
     */
    this.socket = this.setUpSocket(options.socket);

    /**
     * @private
     * @type {number}
     */
    this.clientTimeout = options.clientTimeout > 0 ? options.clientTimeout : 30000;

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
     * @type {Map<string, RemoteClient>}
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
    this.destroySocket();
  }

  /**
   * @returns {boolean}
   */
  isOpen()
  {
    // eslint-disable-next-line no-underscore-dangle
    return this.socket !== null && this.socket._bindState === BIND_STATE_BOUND;
  }

  /**
   * @returns {boolean}
   */
  isOpening()
  {
    // eslint-disable-next-line no-underscore-dangle
    return this.socket !== null && this.socket._bindState === BIND_STATE_BINDING;
  }

  open()
  {
    if (this.isOpen() || this.isOpening())
    {
      return;
    }

    if (this.socket === null)
    {
      this.socket = this.setUpSocket(null);
    }

    this.socket.bind({
      port: this.socketOptions.port,
      startingAddress: this.socketOptions.host,
      exclusive: this.socketOptions.exclusive === true
    });
  }

  close()
  {
    if (this.socket !== null)
    {
      this.destroyClients();
      this.socket.close();
    }
  }

  /**
   * @private
   * @param {?Socket} socket
   * @returns {Socket}
   */
  setUpSocket(socket)
  {
    if (!socket)
    {
      socket = dgram.createSocket({
        type: this.socketOptions.family === 6 ? 'udp6' : 'udp4',
        reuseAddr: this.socketOptions.reuseAddress === true
      });
    }

    socket.on('listening', this.onSocketListening);
    socket.on('close', this.onSocketClose);
    socket.on('error', this.onSocketError);
    socket.on('message', this.onSocketMessage);

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

    socket.removeListener('listening', this.onSocketListening);
    socket.removeListener('close', this.onSocketClose);
    socket.removeListener('error', this.onSocketError);
    socket.removeListener('message', this.onSocketMessage);

    if (this.suppressErrorsAfterDestroy)
    {
      socket.on('error', () => {});
    }

    if (this.closeOnDestroy)
    {
      socket.close();
    }
  }

  /**
   * @private
   */
  onSocketListening()
  {
    this.emit('open');
  }

  /**
   * @private
   */
  onSocketClose()
  {
    this.destroyClients();
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
   * @param {Buffer} message
   * @param {{address: string, port: number, family: string, size: number}} remoteInfo
   */
  onSocketMessage(message, remoteInfo)
  {
    const client = this.setUpClient(remoteInfo);

    client.rescheduleTimeout();
    client.emit('data', message);
  }

  /**
   * @private
   * @param {{address: string, port: number}} remoteInfo
   * @returns {string}
   */
  getRemoteClientKey(remoteInfo)
  {
    return `${remoteInfo.startingAddress}@${remoteInfo.port}`;
  }

  /**
   * @private
   * @param {{address: string, port: number, family: string, size: number}} udpRemoteInfo
   * @returns {UdpRemoteClient}
   */
  setUpClient(udpRemoteInfo)
  {
    const key = this.getRemoteClientKey(udpRemoteInfo);
    const oldClient = this.clients.get(key);

    if (oldClient)
    {
      return oldClient;
    }

    /** @type {UdpRemoteClientInfo} */
    const remoteInfo = {
      address: udpRemoteInfo.startingAddress,
      port: udpRemoteInfo.port,
      family: udpRemoteInfo.family
    };
    const newClient = new UdpRemoteClient(remoteInfo, this.clientTimeout);

    this.clients.set(key, newClient);

    this.emit('client', newClient);

    return newClient;
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
   * @param {string} clientKey
   * @param {Buffer} data
   */
  onClientWrite(clientKey, data)
  {
    const client = this.clients.get(clientKey);

    if (!client)
    {
      return;
    }

    try
    {
      this.socket.send(data, 0, data.length, client.remoteInfo.port, client.remoteInfo.startingAddress);
    }
    catch (err)
    {
      client.emit('error', err);
    }
  }

  /**
   * @private
   * @param {string} clientKey
   */
  onClientDestroy(clientKey)
  {
    this.clients.delete(clientKey);
  }
}

/**
 * @private
 */
class UdpRemoteClient extends RemoteClient
{
  /**
   * @param {UdpRemoteClientInfo} remoteInfo
   * @param {number} timeout
   */
  constructor(remoteInfo, timeout)
  {
    super(remoteInfo);

    /**
     * @private
     * @type {number}
     */
    this.timeout = timeout;

    /**
     * @private
     * @type {?number}
     */
    this.timeoutTimer = null;
  }

  destroy()
  {
    if (this.timeoutTimer)
    {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    super.destroy();
  }

  rescheduleTimeout()
  {
    if (this.timeoutTimer)
    {
      clearTimeout(this.timeoutTimer);
    }

    this.timeoutTimer = setTimeout(this.destroy.bind(this), this.timeout);
  }
}

module.exports = UdpListener;

/**
 * @typedef {Object} UdpListenerOptions
 * @property {Socket} [socket]
 * @property {UdpServerOptions} [socketOptions]
 * @property {boolean} [autoOpen=true]
 * @property {boolean} [clientTimeout=30000]
 * @property {boolean} [closeOnDestroy=true]
 * @property {boolean} [suppressErrorsAfterDestroy=true]
 */

/**
 * @typedef {Object} UdpServerOptions
 * @property {string} [host=localhost]
 * @property {number} [port=502]
 * @property {number} [family=4]
 * @property {boolean} [reuseAddress=false]
 * @property {boolean} [exclusive=false]
 */

/**
 * @typedef {Object} UdpSocketListeners
 * @property {function(): void} close
 * @property {function(Error): void} error
 * @property {function(): void} readable
 */

/**
 * @typedef {Object} UdpRemoteClientInfo
 * @property {string} address
 * @property {number} port
 * @property {string} family
 */
