// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const EventEmitter = require('events').EventEmitter;

class RemoteClient extends EventEmitter
{
  /**
   * @param {Object} remoteInfo
   */
  constructor(remoteInfo)
  {
    super();

    /**
     * @type {Object}
     */
    this.remoteInfo = remoteInfo;
  }

  destroy()
  {
    this.emit('close');
    this.removeAllListeners();
  }

  /**
   * @param {Buffer} data
   */
  write(data)
  {
    this.emit('write', data);
  }
}

module.exports = RemoteClient;
