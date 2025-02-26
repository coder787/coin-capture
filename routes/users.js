const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');

// User Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: req.user
    });
});

// Login Page
router.get('/login', (req, res) => res.render('login'));

// Register Page
router.get('/register', (req, res) => res.render('register'));

module.exports = router;