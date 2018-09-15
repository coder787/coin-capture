// app/models/userCapture.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user key model
var userCapture = mongoose.Schema({

    user        : {
        id          : String,
    },
    details     : {
        name        : String,    
        date        : Date,
        totaldollar : String,
        totalBTC    : String,
        coinprice   : String,
        BTCPrice    : String,
        userCurrency: String,
        portfolio   : Object
    }
});

// create the model for user key and expose it to our app
module.exports = mongoose.model('UserCapture', userCapture);