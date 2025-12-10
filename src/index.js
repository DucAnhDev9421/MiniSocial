require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectMongo } = require('./config/db');
const { verifyConfig: verifyCloudinary } = require('./config/cloudinary.config');
const neo4jService = require('./services/neo4j.service');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// Error handler (phải đặt cuối cùng)
app.use(errorHandler);

async function start() {
  try {
    // Connect to MongoDB
    await connectMongo(process.env.MONGO_URI);
    
    // Connect to Neo4j
    await neo4jService.init({
      uri: process.env.NEO4J_URI,
      user: process.env.NEO4J_USER,
      password: process.env.NEO4J_PASSWORD,
    });

    // Verify Cloudinary config (optional - chỉ verify nếu có env vars)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      verifyCloudinary();
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
