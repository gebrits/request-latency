
- ALL TIME TIME

GET /api/v3/ticker/price

NOTE: no lastId or anything to check order, but this is not a feed we use to do actual trades. 
Only for determining which symbols are interesting to watch. Moreover, since roundtrip-lag is (probably) mostly caused in time BEFORE actual processing, the time in which responses arrive back to us, is likely the correct order (i.e.: there's a low(er) chance of out-of-order-ness from server back to client than from client to server)

Goal: to check which symbols are interesting. Where interesting means: may result in an arbitrage opportunity soon.
Since this has an average price instead of account for bid/ask spread, arbitrage score should probably be pretty high before we consider this a signal. 
I.e: probably above 1 at least. 

NOTE: in absense of server-timstamp in response the best we can do in terms of slack = 6-7ms (heuristic) + 1/2 * sinceLast
NOTE that the above calculation of 'slack' gives us some wiggle room to opt-in/out of order based on the variable: 1/2 * sinceLast.
I.e.: if 0.5 * sinceLast is too big (e.g.: > 4ms) we bail.
NOTE: staleness is increased by the fact that we need to do this for all 3 of the legs. (only check if opportunity on next tick. Nice performant way to debounce)

All this works under the assumption that delivery time (i.e: server -> client) is constant.

This slack + 1ms (processing) + 2ms (placing order) = total time needed.

[
  {
    "symbol": "LTCBTC",
    "price": "4.00000200"
  },
  {
    "symbol": "ETHBTC",
    "price": "0.07946600"
  }
]

Based on signal we start fetching depthbooks. Based on this we can do actual trades. 

------------------
When finally doing actual trades, we get our own trade back incl a timestamp. This can be used to calculate how long the actual trade takes. 
Now, we can really check how we stack against the others.

--------------------

Measuring the others: their trade time - opportunity time. 
opportunity time: there's no timestamp for this (depthbook doesn't give it) so: our receive time (which includes the 7ms + 0.5 * sinceLast) = ~10ms
Let's see the room betweem those ~10ms and their time. Larger than 3ms? We stand a chance.



-------------
As a separate test, fetch trades. Since trades got a timestamp, it's a nice way to check our staleness against actual polled data. 
Answer question like: 
1) staleness distribution. I.e.: 
  - A) lag server -> client response - i.e.: 6-7ms (heuristic))
  - B) timing of request - i.e.: 1/2 * sinceLast
2) does running multiple clients reduce B) (1/2 * sinceLast) and thus overall staleness? Probably



response: 

[
  {
    "id": 28457,
    "price": "4.00000100",
    "qty": "12.00000000",
    "time": 1499865549590,
    "isBuyerMaker": true,
    "isBestMatch": true
  }
]

