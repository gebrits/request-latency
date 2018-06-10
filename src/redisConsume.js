const _ = require("lodash");
const redis = require('redis');
const Promise = require("bluebird");
const sd = require('stdev')

const config = require("./config");

Promise.promisifyAll(redis);

const redisClient = redis.createClient(config.redis);

const readCommandProto = "BLOCK 0 COUNT 10 STREAMS binanceTiming".split(" ");

const startProcess = process.hrtime();

let lastId = null;
let lastTimingPrev = 0;

const timings = {
  roundtrip: [],
  stalenessExcl: [],
  stalenessIncl: [],
  sinceLast: []
}

fetch();

function fetch(fromId = '$') {

  Promise.resolve()
    .then(() => {
      return redisClient.send_commandAsync("xread", readCommandProto.concat(fromId))
        .then(res => {

          //res[0][0] -> streamName
          //res[0][1] -> array

          _.each(res[0][1], event => {

            const id = event[0].toString();
            const { serverTime, clientTime, roundtripMS } = JSON.parse(event[1][1].toString());

            const deltaSinceStart = process.hrtime(startProcess);
            const lastTimingNow = Math.round(((deltaSinceStart[0] * Math.pow(10, 9)) + deltaSinceStart[1]) / 1000000); //from nano to milli 
            const timeSinceLast = lastTimingNow - lastTimingPrev; //TODO: split on type (e.g.: symbol)

            //IMPORTANT
            //For stalenessInclRedisInMS we take new Date().getTime(), although that's not accurate. Another way would be to have a startProcessDT + lastTimingNow
            //buf if startProcessDT is not accurate (this would also use new Date().getTime()) this would skew all results in the same direction. 
            //At least with the current implementation there's a chance skews even eachother out.
            const stalenessExclRedisInMS = clientTime - serverTime;
            const stalenessInclRedisInMS = new Date().getTime() - serverTime;

            console.log(`Roundtrip (with setup): ${("" + roundtripMS).padStart(4, "0")} / Staleness (excl. redis): ${("" + stalenessExclRedisInMS).padStart(3, "0")} / Staleness (incl. redis): ${("" + stalenessInclRedisInMS).padStart(3, "0")} / Since last: ${("" + timeSinceLast).padStart(3, "0")}`);

            lastTimingPrev = lastTimingNow;
            lastId = id;

            timings.roundtrip.push(roundtripMS);
            timings.stalenessExcl.push(stalenessExclRedisInMS);
            timings.stalenessIncl.push(stalenessInclRedisInMS);
            timings.sinceLast.push(timeSinceLast);

          });

          return lastId;
        });
    })
    .then(lastId => {
      fetch(lastId); //don't return, bc this will create an indefinite resolve stack (thus mem-leak)
    })
    .catch(err => {

      //TODO: log to somewhere
      console.log("err", err);

      fetch(fromId); //start again from fromId
    })
}

setInterval(() => stats(), 1000);

function statsPerFeature(times) {
  const sigma = sd(times)
  const mu = mean(times)

  return {
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

function stats() {
  console.log("######################################");
  console.log("######################################");
  _.each(timings, (feature, k) => {
    console.log("#########################");
    console.log(k.toUpperCase());

    const results = statsPerFeature(feature);
    const sortedTimes = results.times.sort();
    const median = sortedTimes[Math.ceil(sortedTimes.length / 2)]; //can be zero when latency is high, since then we batch-consume
    console.log('Request count:', results.count)
    console.log('Average:', results.mean)
    console.log("Median", median)
    console.log('Standard deviation:', results.sd)
    console.log('10th percentile:', results.p10)
    console.log('95th percentile:', results.p95)
    console.log('99th percentile:', results.p99)
  });
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
