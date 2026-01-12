require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectMongo } = require('./config/db');
const { verifyConfig: verifyCloudinary } = require('./config/cloudinary.config');
const neo4jService = require('./services/neo4j.service');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const setupSocket = require('./sockets');

const app = express();
const httpServer = createServer(app);

// Set timeout cho HTTP server (để xử lý upload video lớn)
httpServer.timeout = 300000; // 5 minutes (300 seconds)
httpServer.keepAliveTimeout = 300000; // 5 minutes
httpServer.headersTimeout = 305000; // Slightly higher than keepAliveTimeout

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS middleware - Hỗ trợ ngrok và các origin khác nhau
app.use((req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['*'];
  const origin = req.headers.origin;
  
  // Cho phép tất cả nếu CORS_ORIGIN = '*'
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Xử lý preflight request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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

    // Setup Socket.io
    setupSocket(io);
    console.log('✅ Socket.io initialized');

    // Make io available globally (for notification service)
    app.set('io', io);

    httpServer.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log(`✅ Socket.io server ready`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
