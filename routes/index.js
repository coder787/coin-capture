const express = require('express');
const router = express.Router();

// Home Page
router.get('/', (req, res) => {
    res.render('index', { title: 'Home', user: req.user });
});

module.exports = router;