const neo4j = require('neo4j-driver');
let driver;

async function init({ uri, user, password }) {
  if (!uri || !user || !password) throw new Error('Neo4j config missing');
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  // Verify connectivity
  await driver.verifyConnectivity();
  console.log('Connected to Neo4j');
}

function getSession(mode = neo4j.Session.WRITE) {
  if (!driver) throw new Error('Neo4j driver not initialized');
  return driver.session({ defaultAccessMode: mode });
}

async function createUserNode({ id, name, email }) {
  const session = getSession();
  try {
    const result = await session.run(
      'MERGE (u:User {id: $id}) SET u.name = $name, u.email = $email RETURN u',
      { id, name, email }
    );
    return result.records[0]?.get('u');
  } finally {
    await session.close();
  }
}

async function close() {
  if (driver) await driver.close();
}

module.exports = { init, getSession, createUserNode, close };
