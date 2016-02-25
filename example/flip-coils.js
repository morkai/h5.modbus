'use strict';

// Connects to the specified MODBUS TCP/IP slave and sets consecutive coils
// ON and OFF. For example, if `COIL_QUANTITY` is 8, then one should see the
// following output:
// [ 1, 0, 0, 0, 0, 0, 0, 0 ]
// [ 0, 1, 0, 0, 0, 0, 0, 0 ]
// [ 0, 0, 1, 0, 0, 0, 0, 0 ]
// [ 0, 0, 0, 1, 0, 0, 0, 0 ]
// [ 0, 0, 0, 0, 1, 0, 0, 0 ]
// [ 0, 0, 0, 0, 0, 1, 0, 0 ]
// [ 0, 0, 0, 0, 0, 0, 1, 0 ]
// [ 0, 0, 0, 0, 0, 0, 0, 1 ]
// [ 1, 0, 0, 0, 0, 0, 0, 0 ]
// [ 0, 1, 0, 0, 0, 0, 0, 0 ]
// ...

var SLAVE_HOST = '127.0.0.1';
var SLAVE_PORT = 502;
// A starting address of the coils.
var COIL_ADDRESS = 0x0000;
// A number of consecutive coils to flip.
// Starting at the specified `COIL_ADDRESS`.
var COIL_QUANTITY = 8;
// A number of milliseconds between flips.
var SET_DELAY = 150;

var modbus = require('../lib');

var master = modbus.createMaster({
  transport: {
    type: 'ip',
    connection: {
      type: 'tcp',
      host: SLAVE_HOST,
      port: SLAVE_PORT
    }
  }
});

function setCoils(onIndex)
{
  if (++onIndex === COIL_QUANTITY)
  {
    onIndex = 0;
  }

  var states = [];

  for (var i = 0; i < COIL_QUANTITY; ++i)
  {
    states.push(i === onIndex);
  }

  master.writeMultipleCoils(COIL_ADDRESS, states, {
    onComplete: function(err, response)
    {
      if (err)
      {
        console.error(err.message);
      }
      else if (response.isException())
      {
        console.log(response.toString());
      }

      readCoils(onIndex);
    }
  });
}

function readCoils(onIndex)
{
  master.readCoils(COIL_ADDRESS, COIL_QUANTITY, {
    onComplete: function(err, response)
    {
      if (err)
      {
        console.error(err.message);
      }
      else if (response.isException())
      {
        console.log(response.toString());
      }
      else
      {
        console.log(response.getStates().map(Number));
      }

      setTimeout(function() { setCoils(onIndex); }, SET_DELAY);
    }
  });
}

master.once('connected', function()
{
  setCoils(-1);
});
