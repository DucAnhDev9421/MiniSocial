const User = require('../models/user.model');
const neo4jService = require('../services/neo4j.service');

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  // Note: In a real app, hash password (bcrypt) and validate input
    const user = new User({ name, email, password });
  await user.save();

  // Create a corresponding node in Neo4j for graph relationships
  await neo4jService.createUserNode({ id: user._id.toString(), name: user.name, email: user.email });

  return res.status(201).json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(409).json({ message: 'Email already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { register };
