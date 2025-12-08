# Mini Social - Backend (Node.js + Express + MongoDB + Neo4j)

This repository is a starter scaffold for a mini social network backend using Node.js, Express, MongoDB (Mongoose) and Neo4j (graph DB).

## What's included
- Express server entry `src/index.js`
- MongoDB connection helper `src/config/db.js`
- Neo4j service `src/services/neo4j.service.js`
- Basic `User` Mongoose model `src/models/user.model.js`
- Simple user controller and route
- `.env.example` with required environment variables

## Setup
1. Copy `.env.example` to `.env` and fill values for MongoDB and Neo4j.
2. Install dependencies:

```cmd
npm install
```

3. Start the server:

```cmd
npm run start
```

For development with auto-reload (requires `nodemon`):

```cmd
npm run dev
```

## Env variables (`.env`)
- PORT=3000
- MONGO_URI=mongodb://localhost:27017/minisocial
- NEO4J_URI=bolt://localhost:7687
- NEO4J_USER=neo4j
- NEO4J_PASSWORD=secret

## Next steps
- Implement auth, posts, follow graph in Neo4j, notifications, and tests.
