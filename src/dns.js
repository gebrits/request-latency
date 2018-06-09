const dns = require('dns');
const http2 = require('http2');

const options = {
  family: 6,
  hints: dns.ADDRCONFIG | dns.V4MAPPED,
};

// dns.lookup('example.com', options, (err, address, family) => {
//   console.log('example.com address: %j family: IPv%s', address, family);
// });

// dns.lookup('api.binance.com', options, (err, address, family) => {
//   console.log('api.binance.com address: %j family: IPv%s', address, family);
// });

// // address: "2606:2800:220:1:248:1893:25c8:1946" family: IPv6

const client = http2.connect(`https://api.binance.com`, options);
client.on('error', (err) => console.error(err));
client.on('remoteSettings', (settings) => {
  console.log("TODO: remoteSettings. Can this be used to optimize anything?", settings);
  console.log("localAddress", client.socket.localAddress);

  const req = client.request({ ':path': "/api/v1/time" });
  req.on('response', (headers, flags) => {

    let data = '';
    req.on('data', chunk => { data += chunk; })
      .on('end', () => {
        console.log("data", data);
        client.destroy();
      });

  });
});
