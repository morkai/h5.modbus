# slave.js

Starts a MODBUS TCP slave that handles the following functions:

  * read discrete inputs,
  * read coils,
  * read holding registers and
  * read input registers functions.

Every 100ms the first 8 coil states are randomized, every 50ms the second 8and every 33ms the third.

Also, every 1s after a client connects, performance stats are written to the stdout:

```
> node slave
listener#open
listener#client: 1
rps=40496 (min=40496 max=40496 cur=40496) req=40496 res=40496 err=0 rss=46 (min=46 max=46)
rps=42440 (min=40496 max=42440 cur=44384) req=84880 res=84880 err=0 rss=68 (min=46 max=68)
rps=43286 (min=40496 max=43286 cur=44978) req=129858 res=129858 err=0 rss=71 (min=46 max=71)
rps=43686 (min=40496 max=43686 cur=44885) req=174743 res=174743 err=0 rss=68 (min=46 max=71)
rps=44146 (min=40496 max=44146 cur=45989) req=220732 res=220732 err=0 rss=70 (min=46 max=71)
```

# master.js

Starts a MODBUS master, which:

  1. connects to a MODBUS slave listening on `localhost:502`
  2. repeatedly sends 10 separate 'read 8 coils starting at address `0x0000`' requests
  3. every 1s after connecting, writes performance stats to the stdout:

```
> node master
[open]
rps=40592 (min=40592 max=40592 cur=40592) req=40592 res=40592 err=0 rss=31 (min=31 max=31)
rps=42492 (min=40592 max=42492 cur=44392) req=84984 res=84984 err=0 rss=31 (min=31 max=31)
rps=43323 (min=40592 max=43323 cur=44985) req=129969 res=129969 err=0 rss=31 (min=31 max=31)
rps=43712 (min=40592 max=43712 cur=44880) req=174849 res=174849 err=0 rss=31 (min=31 max=31)
rps=44150 (min=40592 max=44150 cur=45903) req=220752 res=220752 err=0 rss=31 (min=31 max=31)
```

The script can be quickly configured to:

  * limit the number of repeatable transactions by changing the `TRANSACTIONS` constant.
  * limit the number of concurrent transactions sent to the slave by changing the `CONCURRENT_TRANSACTIONS` constant.
  * use a different read function by changing the `FUNCTION_CODE` constant.
  * read a different number of coils/registers by changing the `QUANTITY` constant.
  * delay the repeated execution of transactions by changing the `INTERVAL` constant.
  * write request, response, TX and RX data to the stdout by changing the `DEBUG` constant.
  * disable the performance stats by changing the `STATS` constant.

`TRANSACTIONS` specifies how many repeatable transactions are created and managed by the Master.  
`CONCURRENT_TRANSACTIONS` specifies how many transactions are executed in parallel by the Master (i.e. how many requests are sent concurrently).  
For example, if `TRANSACTIONS=10` and `CONCURRENT_TRANSACTIONS=10`, then no transactions are queued.
The first transaction will be executed again immediately after receiving the response.  
If `TRANSACTIONS=10` and `CONCURRENT_TRANSACTIONS=1`, then only one transaction is executed at a time and the rest is waiting in a queue until their turn comes.
The first transaction will be executed again immediately after the 10th transaction completes.
