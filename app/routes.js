// app/routes.js
//var currencyFormatter = require('currency-formatter'); moved to controller file
//var UserSettings = require('../app/models/usersettings'); moved to controller file
//var async = require("async"); not needed
//const btcValue = require('btc-value'); // moved to controller file

// app/controllers.js
var userKey = require("../app/controllers/userKeyController.js");
var userCapture = require("../app/controllers/userCaptureController.js");
var userSettings = require("../app/controllers/userSettingsController.js");
var userCoin = require("../app/controllers/userCoinController.js");
var userProfile = require("../app/controllers/userProfileController.js");

module.exports = function (app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function (req, res) {
        
        var loggedin = null;
        var userEmail = null;

        // check if user is logged in or not and pass to render
        if (req.user) {
            loggedin = 'yes';
            userEmail = req.user.local.email;
        } else { loggedin = 'no';}

        res.render('index.ejs', {
            user: req.user,
            loggedin: loggedin,
            userEmail: userEmail
        }); // load the index.ejs file

    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function (req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', {
            user: req.user,
            message: req.flash('loginMessage')
        });
    });

    // process the login form
    // app.post('/login', do all our passport stuff here);

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function (req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', {
            message: req.flash('signupMessage')
        });
    });

    // process the signup form
    // app.post('/signup', do all our passport stuff here);

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, userProfile.Show);

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    // =====================================
    // ENTER KEYS =========================
    // =====================================
    app.get('/enter', function (req, res) {

        const ccxt = require('ccxt');

        app.locals.exchangesArray = ccxt.exchanges;

        res.render('enter.ejs', {
            user: req.user,
            exchangesArray: app.locals.exchangesArray,
            message: req.flash('info')
        });
    });

    // =====================================
    // DELETE KEYS =========================
    // =====================================
    app.get('/deletekeys', userKey.DeleteGet);

    // =====================================
    // ENTER COINS =========================
    // =====================================
    app.get('/manual', function (req, res) {

        const ccxt = require('ccxt');

        app.locals.exchangesArray = ccxt.exchanges;

        res.render('manual.ejs', {
            user: req.user,
            exchangesArray: app.locals.exchangesArray,
            dupCoinarray: null,
            selectedExchange: null,
            message: req.flash('info'),
        });

    });

    // =====================================
    // DELETE COINS ========================
    // =====================================
    app.get('/deletecoins', userCoin.DeleteGet);

    // =====================================
    // DELETE CAPTURES =====================
    // =====================================
    app.get('/deletecaptures', userCapture.DeleteGet);

    // =====================================
    // VIEW COINS ==========================
    // =====================================
    //app.get('/view', userCapture.Portfolio);
    app.get('/view', userCapture.Portfolio);

    // =====================================
    // CAPTURES ============================
    // =====================================
    app.get('/captures', userCapture.View);

    app.get('/captures/view/:captureID', userCapture.ViewCaptureID);

    // =====================================
    // MANAGE CAPTURES =====================
    // =====================================
    app.get('/managecaptures', userCapture.Manage);

    // =====================================
    // COMPARE =============================
    // =====================================
    app.get('/compare', userCapture.Find); 

    // =====================================
    // CHARTS ==============================
    // =====================================
    app.get('/charts', userCapture.Charts); 

    // =====================================
    // SETTINGS ============================
    // =====================================
    app.get('/settings', userSettings.Find);

    // process the settings form
    app.post('/addsettings', userSettings.Create);

    // process the enter form
    app.post('/addkeys', userKey.Create);

    // process deletekeys
    app.post('/deletekeys', userKey.Delete); 

    // process deletecoins
    app.post('/deletecoins', userCoin.Delete); 

      // process deletecapture
      app.post('/deletecaptures', userCapture.Delete); 

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/signup', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // process capture
    app.post('/capture', userCapture.Create);

    // process view capture
    app.post('/viewcapture', userCapture.Search);

    // process compare capture
    app.post('/comparecapture', userCapture.Compare);
    
    // process add coins
    app.post('/addcoins', userCoin.Process);


}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
    return next();
    

    // if they aren't redirect them to the home page
    res.redirect('/');
}
