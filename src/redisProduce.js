const Promise = require("bluebird");
const redis = require('redis');
const _ = require("lodash");

Promise.promisifyAll(redis);

const client = redis.createClient({
  port: 6379,
  host: '13.113.183.3', // Redis host
  family: 4,
  password: 'DAskjdaSAd89438S*AD%^D32SAD$#@#!LAKDk)(&$#@!',
  db: 0
})

//maximize to about 1000
const addCommandProto = "mystream MAXLEN ~ 1000 *".split(" ");

const promises = _.map(_.times(100), () => {
  const commandArr = addCommandProto.concat(["message", "NodeJS"]);
  return client.send_commandAsync("xadd", addCommandProto.concat(["message", "NodeJS"]))
    .then(id => {
      console.log("id", id);
    })
});

Promise.all(promises)
  .then(() => {
    client.quit();
  })
