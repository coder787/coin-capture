// app/models/userKey.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user key model
var userKeySchema = mongoose.Schema({

    user        : {
        id          : String,
    },
    details     : {
        exchange    : String,
        key         : String,
        secret      : String,
        added       : String
    }
});

// create the model for user key and expose it to our app
module.exports = mongoose.model('UserKey', userKeySchema);