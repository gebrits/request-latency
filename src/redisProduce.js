const Promise = require("bluebird");
const redis = require('redis');
const _ = require("lodash");

const config = require("./config");

Promise.promisifyAll(redis);

const redisClient = redis.createClient(config.redis);

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
