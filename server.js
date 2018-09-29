// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
let cron = require('cron'); // added for cron job
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

require('dotenv').config() // used to load environment variables from .env file

var configDB = require('./config/database.js');

console.log("process.env.MONGOLAB_URI is now", process.env.MONGOLAB_URI);
// configuration ===============================================================
mongoose.connect(configDB.url, {
    useMongoClient: true
}); // connect to our database
//mongoose.createConnection(configDB.url);

require('./config/passport')(passport); // pass passport for configuration



// set up our express application
app.use(morgan('dev')); // log every request to the console


let autocaptureJob = require('./jobs/autocapture')(cron);

app.use(cookieParser()); // read cookies (needed for auth)
//app.use(bodyParser()); // get information from html forms // depreciated
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());


app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
//app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret // depreciated
app.use(session({
    secret: 'abc',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// middleware to pass user to all templates
app.use(function (req, res, next) {

    if (req.user == undefined) {
        req.user = null;
    }

    res.locals.user = req.user;
    next();
});

app.use(express.static(__dirname + '/public'));

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);