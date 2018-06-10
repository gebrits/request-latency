const _ = require("lodash");
const redis = require('redis');
const Promise = require("bluebird");

Promise.promisifyAll(redis);

const redisClient = redis.createClient({
  port: 6379,
  host: '13.113.183.3', // Redis host
  family: 4,
  password: 'DAskjdaSAd89438S*AD%^D32SAD$#@#!LAKDk)(&$#@!',
  db: 0
})

const readCommandProto = "BLOCK 0 COUNT 10 STREAMS binanceTiming".split(" ");

fetch();

function fetch(fromId = '$') {

  Promise.resolve()
    .then(() => {
      return redisClient.send_commandAsync("xread", readCommandProto.concat(fromId))
        .then(res => {

          throw new Error("test");

          //res[0][0] -> streamName
          //res[0][1] -> array

          let lastId = null;

          _.each(res[0][1], event => {
            const id = event[0].toString();
            // const k = event[1][0].toString();
            const payload = JSON.parse(event[1][1].toString());
            console.log(payload);
            lastId = id;
          });

          return lastId;
        });
    })
    .then(lastId => {
      fetch(lastId); //don't return, bc this will create an indefinite resolve stack (thus mem-leak)
    })
    .catch(err => {
      console.log("probably start over again from '$'");
      console.log("err", err);
      throw err;

    })

}
