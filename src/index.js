/**
 * Imports
 */

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

const sd = require('stdev')
const sleep = require('@f/sleep')
const elapsed = require('@f/elapsed-time')
const rp = require('request-promise');



// var http = require('http'),
//   start = timestamp();

// var options =   {
//       hostname: 'www.google.co.uk',
//       port: 80,
//       path: '/',
//       method: 'GET'
//     };

// for(var i = 0; i<25; i++) {
//   var req = http.get(options, function(res) {  
//     res.on('data', function(chunk) {  
//     });   
//   }).on('socket', function(e) {  
//      console.log("Socket to Google",timestamp() - start);  
//   });
// }   

// Socket to Google 0.02200007438659668
// Socket to Google 0.024000167846679688
// Socket to Google 0.024000167846679688
// Socket to Google 0.024000167846679688
// Socket to Google 0.024000167846679688
// Socket to Google 0.1360001564025879
// Socket to Google 0.14300012588500977
// Socket to Google 0.16000008583068848
// Socket to Google 0.16000008583068848
// Socket to Google 0.16100001335144043
// Socket to Google 0.21700000762939453
// Socket to Google 0.21800017356872559
// Socket to Google 0.23200011253356934
// Socket to Google 0.2330000400543213
// Socket to Google 0.23600006103515625
// Socket to Google 0.2740001678466797
// Socket to Google 0.27500009536743164
// Socket to Google 0.2850000858306885
// Socket to Google 0.2910001277923584
// Socket to Google 0.312000036239624
// Socket to Google 0.38000011444091797
// Socket to Google 0.3900001049041748
// Socket to Google 0.3970000743865967
// Socket to Google 0.39800000190734863
// Socket to Google 0.3990001678466797 


/**
 * Request latency
 */

function latency(url, n = 50, sleepMs = 30) {

  console.log(`n = ${n} / sleep = ${sleepMs}`);

  const times = []

  function onDone() {
    const sigma = sd(times)
    const mu = mean(times)

    return {
      url,
      count: n,
      times,
      mean: mu,
      sd: sigma,
      p95: p95(mu, sigma),
      p99: p99(mu, sigma)
    }
  }

  return new Promise((resolve, reject) => {

    let counterDone = 0;

    for (var i = 0; i < n; i++) {

      setTimeout(() => {

        const t = elapsed();

        rp(url).then(({ serverTime }) => {

          times.push(t());

          if (++counterDone === n) {

            const sigma = sd(times)
            const mu = mean(times)

            resolve({
              url,
              count: n,
              times,
              mean: mu,
              sd: sigma,
              p95: p95(mu, sigma),
              p99: p99(mu, sigma)
            });
          }

        });

      }, i * sleepMs);

    }
  })
}


/**
 * Helpers
 */

function mean(list) {
  return list.reduce((acc, item) => acc + item, 0) / list.length
}

function p95(mu, sigma) {
  const z = 1.645
  return percentile(z, mu, sigma)
}

function p99(mu, sigma) {
  const z = 2.326
  return percentile(z, mu, sigma)
}

function percentile(z, mu, sigma) {
  return z * sigma + mu
}

/**
 * Exports
 */

module.exports = latency
