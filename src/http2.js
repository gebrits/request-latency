/**
 * Imports
 */

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

const http2 = require('http2');
const sd = require('stdev')
const request = require('request');
const _ = require("lodash");
const argv = require("yargs").argv;
const URL = require("url");

const url = URL.parse(argv.url || "");

if (!url.host) {
  throw new Error("--url is required and should be a valid Url")
}

latency(url, +argv.n || 50, +argv.sleep || 50, argv.keepAlive == "true");

function latency(url, n, sleepMs, keepAlive) {

  console.log(`url = ${url} / n = ${n} / sleep = ${sleepMs} / keepAlive = ${keepAlive}`);

  const client = http2.connect(`${url.protocol}//${url.host}`, {
    // localAddress: "192.168.178.150" //YEAH
  });
  client.on('error', (err) => console.error(err));

  const times = []

  let nrErrors = 0;
  new Promise((resolve, reject) => {

      let counterDone = 0;

      const startProcess = process.hrtime();
      let lastTimingPrev = 0;

      for (var i = 0; i < n; i++) {

        setTimeout(() => {

          const start = process.hrtime();

          const req = client.request({ ':path': url.path });
          req.on('response', (headers, flags) => {

            let data = '';
            req.on('data', chunk => { data += chunk; })
              .on('end', () => {

                if (headers[":status"] !== 200) {
                  nrErrors++;
                  console.log("ERR", data);
                }
                ////////////////////////
                // TODO: 
                // 1. fetch errors (does request have error endpoint? Or are all http-status codes just non-errors, and are socket errors handled on client instead as request? As already done)
                // 2. test with round robin list of networks (localAddress) to get max trhoughput. Make this command-param
                // 3. actually log MB/sec
                // 4. stat nr 1/2/3/4/5 per opportunity
                //   - also. If [10-20]ms -> For each: how often would we be 1/2/3/4/5 (distribition + avg)
                // 5. actually get responses that got some time in them so we might deduce what the actual lag is instead of purely going from the 15ms
                //   - logical to use the time endpoint.
                //   -> assuming time is the same (make sure to sync our time with AWS atomic clock): 
                //   -> (client time on receive - time displayed) = stalesness lag.
                //   
                // 6. fetch orders which have timestamp to get a distribution of actual lag, including the xms (5ms) we keep between requests. 
                // This should on average be 2.5ms + the avg staleness we see on timing-endpoint (7ms) + perhaps 1ms for extra processing / download => ~10ms
                // 10ms + 1ms processing + 2ms setting order -> 13ms => sounds good
                // 

                const deltaHR = process.hrtime(start);
                const deltaSinceProcess = process.hrtime(startProcess);

                const tookMS = Math.round(((deltaHR[0] * Math.pow(10, 9)) + deltaHR[1]) / 1000000); //from nano to milli 
                const lastTimingNow = Math.round(((deltaSinceProcess[0] * Math.pow(10, 9)) + deltaSinceProcess[1]) / 1000000); //from nano to milli 

                const timeSinceLast = lastTimingNow - lastTimingPrev;
                lastTimingPrev = lastTimingNow;

                //Assuming both servers are synced, the time response received at client - time reported on server at time of processing => staleness of data in millis
                //This is a far better measure of checking how accurate the data is. In fact we don't care much how long the request takes before it's being processed by the binance-servers
                //as this doesn't change the staleness of the data.
                const now = new Date().getTime();
                const nowOnServer = JSON.parse(data).serverTime;
                const stalenessInMS = now - nowOnServer;

                console.log(`Roundtrip (with setup): ${("" + tookMS).padStart(3, "0")} / Staleness: ${("" + stalenessInMS).padStart(3, "0")} / Since last: ${("" + timeSinceLast).padStart(3, "0")}`);

                // times.push(tookMS);
                times.push(stalenessInMS);

                if (++counterDone === n) {
                  client.destroy(); // try remove this line see what changed?

                  const sigma = sd(times)
                  const mu = mean(times)

                  resolve({
                    url,
                    count: n,
                    times,
                    mean: mu,
                    sd: sigma,
                    p10: p10(mu, sigma),
                    p50: p50(mu, sigma),
                    p95: p95(mu, sigma),
                    p99: p99(mu, sigma)
                  });
                }
              });
          });

        }, i * sleepMs);

      }
    })
    .then(results => {

      const sortedTimes = times.sort();
      const median = sortedTimes[Math.ceil(sortedTimes.length / 2)];

      console.log("#########################");
      console.log('Url:', argv.url)
      console.log('Request count:', results.count)
      console.log('Average:', results.mean)
      console.log("Median", median)
      console.log('Standard deviation:', results.sd)
      console.log('10th percentile:', results.p10)
      console.log('95th percentile:', results.p95)
      console.log('99th percentile:', results.p99)
      console.log("errors", nrErrors)
    })
}

/**
 * Helpers
 */

function mean(list) {
  return list.reduce((acc, item) => acc + item, 0) / list.length
}

function p50(mu, sigma) {
  const z = 0
  return percentile(z, mu, sigma)
}

function p10(mu, sigma) {
  const z = -1.28155
  return percentile(z, mu, sigma)
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
