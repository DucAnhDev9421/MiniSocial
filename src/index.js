require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { connectMongo } = require('./config/db');
const neo4jService = require('./services/neo4j.service');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan('dev'));

app.use('/api', routes);

async function start() {
  try {
    await connectMongo(process.env.MONGO_URI);
    await neo4jService.init({
      uri: process.env.NEO4J_URI,
      user: process.env.NEO4J_USER,
      password: process.env.NEO4J_PASSWORD,
    });

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
