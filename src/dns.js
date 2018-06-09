const dns = require('dns');
const options = {
  family: 6,
  hints: dns.ADDRCONFIG | dns.V4MAPPED,
  all: true
};

dns.lookup('example.com', options, (err, address, family) => {
  console.log('example.com address: %j family: IPv%s', address, family);
});

dns.lookup('api.binance.com', options, (err, address, family) => {
  console.log('api.binance.com address: %j family: IPv%s', address, family);
});

// address: "2606:2800:220:1:248:1893:25c8:1946" family: IPv6
