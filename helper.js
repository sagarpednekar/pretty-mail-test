const NodeCache = require("node-cache");

const cacheInstance = new NodeCache({ stdTTL: 1799, checkperiod: 120 });

const setKey = (keyname, obj) => {
  return cacheInstance.set(keyname, obj);
};

const getKey = (keyname) => {
  return cacheInstance.get(keyname);
};

const removeKey = (keyname) => {
  return cacheInstance.del(keyname);
};

module.exports = {
  setKey,
  getKey,
  removeKey,
};
