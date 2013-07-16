'use strict';

// Concise example of reading `8` discrete inputs starting from address `0x0000`
// from a MODBUS TCP/IP slave (with all configuration options implicitly set
// to default values).

var modbus = require('../lib');

var master = modbus.createMaster({});

master.once('connected', function()
{
  var t1 = master.readDiscreteInputs(0x0000, 8, {
    interval: 100,
    onComplete: function(err, response)
    {
      if (err)
      {
        console.error(err.message);
      }
      else
      {
        console.log(response.toString());
      }
    }
  });

  setTimeout(
    function()
    {
      t1.cancel();
      master.destroy();
    },
    5000
  );
});
