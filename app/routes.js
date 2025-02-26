const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated } = require('../config/auth');

// Controllers
const userController = require('../controllers/userController');
const userCaptureController = require('../controllers/userCaptureController');
const userCoinController = require('../controllers/userCoinController');
const userKeyController = require('../controllers/userKeyController');
const userProfileController = require('../controllers/userProfileController');
const userSettingsController = require('../controllers/userSettingsController');

// Home Route
router.get('/', (req, res) => res.render('index', { user: req.user }));

// User Routes
router.get('/login', userController.login);
router.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));
router.get('/logout', userController.logout);
router.get('/signup', userController.signup);
router.post('/signup', userController.signupPost);

// Capture Routes
router.get('/captures', ensureAuthenticated, userCaptureController.View);
router.post('/create', ensureAuthenticated, userCaptureController.Create);
router.get('/view', ensureAuthenticated, userCaptureController.Portfolio);

// Coin Routes
router.get('/manual', ensureAuthenticated, userCoinController.Process);
router.post('/manual', ensureAuthenticated, userCoinController.Process);
router.get('/deletecoins', ensureAuthenticated, userCoinController.DeleteGet);
router.post('/deletecoins', ensureAuthenticated, userCoinController.Delete);

// Key Routes
router.get('/enter', ensureAuthenticated, userKeyController.Create);
router.post('/enter', ensureAuthenticated, userKeyController.Create);
router.get('/deletekeys', ensureAuthenticated, userKeyController.DeleteGet);
router.post('/deletekeys', ensureAuthenticated, userKeyController.Delete);

// Profile Route
router.get('/profile', ensureAuthenticated, userProfileController.Show);

// Settings Route
router.get('/settings', ensureAuthenticated, userSettingsController.Find);
router.post('/settings', ensureAuthenticated, userSettingsController.Create);

module.exports = router;