// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const Server = require('net').Server;

// Monkey-patching the `net.Server` to add support for the `TcpListener#isOpening()` method.
// `net.Server#binding` will be `true` after a call to `net.Server#listen()` and until the first `listening`
// or `error` event.
const originalServerListen = Server.prototype.listen;

Server.prototype.binding = false;

Server.prototype.listen = function()
{
  const onComplete = () =>
  {
    this.binding = false;

    this.removeListener('error', onComplete);
    this.removeListener('listening', onComplete);
  };

  this.on('error', onComplete);
  this.on('listening', onComplete);

  this.binding = true;

  return originalServerListen.apply(this, arguments);
};
