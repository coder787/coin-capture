// app/models/userCoin.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user coin model
var userCoinSchema = mongoose.Schema({

    user        : {
        id          : String,
    },
    coins : Object  //an array of user coins
});

// create the model for user key and expose it to our app
module.exports = mongoose.model('UserCoin', userCoinSchema);