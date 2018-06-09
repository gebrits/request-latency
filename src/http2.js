/**
 * Imports
 */

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

const dns = require('dns');
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

if (!argv.network) {
  throw new Error("--network is required. E.g.: 'dev', 'vultr', 'ec2")
}

const networkConfig = require(`./networkConfig/${argv.network}`);

latency(url, +argv.n || 50, +argv.sleep || 50, argv.keepAlive == "true");

function latency(url, n, sleepMs, keepAlive) {

  console.log(`url = ${url} / n = ${n} / sleep = ${sleepMs} / keepAlive = ${keepAlive}`);

  let clients;

  function attachListeners(client) {
    client.on('error', (err) => console.error(err));

    client.on('remoteSettings', (settings) => {
      console.log("TODO: remoteSettings. Can this be used to optimize anything?", settings);
      console.log("localAddress", client.socket.localAddress);
    });
  }

  if (argv.singleClient) {

    console.log("using a single client");

    const client = http2.connect(`${url.protocol}//${url.host}`, { family: 6, hints: dns.ADDRCONFIG | dns.V4MAPPED });
    attachListeners(client);

    clients = [client];

  } else {
    clients = _.map(networkConfig, localAddress => {
      const client = http2.connect(`${url.protocol}//${url.host}`, { localAddress, family: 6, hints: dns.ADDRCONFIG | dns.V4MAPPED });
      attachListeners(client);
      return client;
    })
  }



  const nrClients = clients.length;
  let curClient = 0;

  const timings = {
    roundtrip: [],
    staleness: [],
    sinceLast: []
  }

  let nrErrors = 0;
  new Promise((resolve, reject) => {

      let counterDone = 0;

      const startProcess = process.hrtime();
      let lastTimingPrev = 0;

      for (var i = 0; i < n; i++) {

        setTimeout(() => {

          const start = process.hrtime();
          const client = clients[curClient++ % nrClients]; //round-robin selection of client

          const req = client.request({ ':path': url.path });
          req.on('response', (headers, flags) => {

            let data = '';
            req.on('data', chunk => { data += chunk; })
              .on('end', () => {

                if (headers[":status"] !== 200) {
                  nrErrors++;
                  console.log("ERR", data);
                } else {

                  ////////////////////////
                  // TODO: 
                  // 1. fetch errors (does request have error endpoint? Or are all http-status codes just non-errors, and are socket errors handled on client instead as request? As already done)
                  // 2. test with round robin list of networks (localAddress) to get max trhoughput. Make this command-param
                  // 3. actually log MB/sec
                  // 
                  // 4. stat nr 1/2/3/4/5 per opportunity in ms
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

                  console.log(`Roundtrip (with setup): ${("" + tookMS).padStart(4, "0")} / Staleness: ${("" + stalenessInMS).padStart(3, "0")} / Since last: ${("" + timeSinceLast).padStart(3, "0")}`);

                  timings.roundtrip.push(tookMS);
                  timings.staleness.push(stalenessInMS);
                  timings.sinceLast.push(timeSinceLast);

                }

                if (++counterDone === n) {

                  //destroy clients
                  _.each(clients, client => client.destroy());

                  function createStats(times) {
                    const sigma = sd(times)
                    const mu = mean(times)

                    return {
                      url,
                      count: times.length, //may be errors which don't count to total
                      times,
                      mean: mu,
                      sd: sigma,
                      p10: p10(mu, sigma),
                      p50: p50(mu, sigma),
                      p95: p95(mu, sigma),
                      p99: p99(mu, sigma)
                    }
                  }

                  resolve({
                    roundtrip: createStats(timings.roundtrip),
                    staleness: createStats(timings.staleness),
                    sinceLast: createStats(timings.sinceLast),
                  });
                }
              });
          });

        }, i * sleepMs);

      }
    })
    .then(stats => {

      console.log("#########################");
      console.log('Url:', argv.url)
      console.log("errors", nrErrors)

      _.each(stats, (results, k) => {
        console.log("\n#########################");
        console.log(k.toUpperCase());

        const sortedTimes = results.times.sort();
        const median = sortedTimes[Math.ceil(sortedTimes.length / 2)];
        console.log('Request count:', results.count)
        console.log('Average:', results.mean)
        console.log("Median", median)
        console.log('Standard deviation:', results.sd)
        console.log('10th percentile:', results.p10)
        console.log('95th percentile:', results.p95)
        console.log('99th percentile:', results.p99)

      });

    })
    .catch(err => {
      console.log("err", err);
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
