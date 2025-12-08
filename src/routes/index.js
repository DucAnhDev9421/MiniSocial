const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

nrouter.post('/users/register', userController.register);

nrouter.get('/health', (req, res) => res.json({ ok: true }));

nmodule.exports = router;
