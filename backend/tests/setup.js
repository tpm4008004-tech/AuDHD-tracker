const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (typeof collections[key].deleteMany === 'function') {
      await collections[key].deleteMany({});
    } else if (Array.isArray(collections[key])) {
      collections[key].length = 0;
    }
  }
};

module.exports = { connectDB, closeDB, clearDB };
