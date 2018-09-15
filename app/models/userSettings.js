// app/models/userSettings.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user settings
var userSettingsSchema = mongoose.Schema({

    user        : {
        id          : String,
        email       : String
    },
    settings     : {
        currency    : String,
        autocapture : String,
        interval    : String
    }
});

// create the model for user key and expose it to our app
module.exports = mongoose.model('UserSettings', userSettingsSchema);