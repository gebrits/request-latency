const Promise = require("bluebird");
const redis = require('redis');

const dns = require('dns');
const http2 = require('http2');
const sd = require('stdev')
const request = require('request');
const _ = require("lodash");
const argv = require("yargs").argv;
const URL = require("url");

const config = require("./config");

Promise.promisifyAll(redis);

const redisClient = redis.createClient(config.redis);


const n = +argv.n || 50;
const sleepMs = +argv.sleep || 50;
const urlAsString = "https://api.binance.com/api/v1/time";
const url = URL.parse(urlAsString);

console.log(`url = ${urlAsString} / n = ${n} / sleep = ${sleepMs}`);

const client = http2.connect(`${url.protocol}//${url.host}`);
client.on('error', (err) => console.error(err));
// client.on('remoteSettings', (settings) => {
//   console.log("TODO: remoteSettings. Can this be used to optimize anything?", settings);
//   console.log("localAddress", client.socket.localAddress);
// });

//A stream per type of events. 
//NOTE: XREAD can read multiple streams at once
const addCommandProto = "binanceTiming MAXLEN ~ 1000 *".split(" ");

let nrErrors = 0;

function call(i) {
  return new Promise((resolve, reject) => {
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
              resolve();

            } else {

              const deltaHR = process.hrtime(start);
              const tookMS = Math.round(((deltaHR[0] * Math.pow(10, 9)) + deltaHR[1]) / 1000000); //from nano to milli 

              const payload = {
                serverTime: JSON.parse(data).serverTime,
                clientTime: new Date().getTime(),
                roundtripMS: tookMS
              }

              const commandArr = addCommandProto.concat(["payload", JSON.stringify(payload)]);

              return redisClient.send_commandAsync("xadd", commandArr)
                .then(id => {
                  console.log("WRIITEN", id);
                  resolve();
                })
            }
          });
      });
    }, i * sleepMs);
  })
}

Promise.all(_.map(_.times(n), i => call(i)))
  .finally(() => {
    console.log("done", "errors: ", nrErrors)
    client.destroy();
    redisClient.quit();
  })
