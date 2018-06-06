var http = require('http');

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;


var options = {
  hostname: 'api.binance.com',
  port: 80,
  path: '/api/v1/time',
  method: 'GET'
};

var start = process.hrtime();


for (var i = 0; i < 200; i++) {
  var req = http.get(options, function (res) {
    res.on('data', function (chunk) {});
  }).on('socket', function (e) {
    console.log("Socket to Google", process.hrtime(start));
  });
}
