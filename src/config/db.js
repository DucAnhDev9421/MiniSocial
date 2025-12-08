const mongoose = require('mongoose');

async function connectMongo(uri) {
  if (!uri) throw new Error('MONGO_URI not provided');
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
}

module.exports = { connectMongo };
