var mongoose = require("mongoose");
var UserSettings = require('../models/userSettings');
const ccxt = require('ccxt');



// given a user ID return the user settings object
exports.findUserSettings = async function (userID, callback) {

    console.log("FINDING USER SETTINGS FOR USER: ", userID);
    // build query to find user keys array
    var userSettingsQuery = UserSettings.findOne({
        'user.id' : userID
    });
    
    // exec the query and return the result as callback
    var userCurrency = userSettingsQuery.exec(function (err, userSettingsObject) {
        if (err) return handleError(err);
        console.log("RETURNING USER SETTINGS OBJECT OF ", userSettingsObject);
        callback(userSettingsObject);
    });
};

// given a user settings object returns the users currency
exports.findUserCurrency = function (userSettingsObject) {

    console.log("IN FUNCTION FINDING USER CURRENCY");

    if (userSettingsObject == null) {

        console.log("RETURNING DEFAULT CURRENCY OF USD");
        return 'USD'; // hack: in case settings record doesnt exist use default of USD
    } 
    else {

        console.log("RETURNING USER CURRENCY OF: ", userSettingsObject.settings.currency);

        return userSettingsObject.settings.currency;
    }
}

// create setting
exports.Create = function (req, res) {

    // find user currency, if exists update, if not then save new

    // find if there is an existing user currency

    exports.findUserSettings(req.user._id, function(userSettingsObject) {

        console.log("USER SETTINGS OBJECT IS NOW", userSettingsObject);


        //userCurrency = userSettingsObject.settings.currency;


        console.log("user setting found is now", userSettingsObject);

        // check if exists
        if (userSettingsObject == null) {
            console.log("does not exist, so creating");
            // does not exist. so create and save
            var newUserSettings = new UserSettings();

            newUserSettings.user.id = req.user._id;
            newUserSettings.settings.currency = req.body.currency;
            newUserSettings.settings.autocapture = req.body.autocapture;
            newUserSettings.settings.interval = req.body.interval;

            console.log("req body auto capture is now", req.body.autocapture );

            newUserSettings.save(function (err) {

                if (err)
                    throw err;
                console.log("saved user settings to DB", newUserSettings);

                req.flash('info', 'Updated settings')
                res.redirect('/settings');
            });

        } else {

            console.log("exists, so updating to ", req.body.currency);
            // exists so update
            UserSettings.update({
                'user.id': req.user._id
            }, {
                'settings.currency': req.body.currency,
                'settings.autocapture': req.body.autocapture,
                'setttings.interval' : req.body.interval
            }, function (err) {
                if (err)
                    throw err;

                console.log("updated settings to DB", UserSettings);

                req.flash('info', 'Updated settings')
                res.redirect('/settings');

            })

        }
    });


};

// find setting
exports.Find = function (req, res) {

    var currencyArray = [{
            "code": "AUD",
            "symbol": "$"
        },
        {
            "code": "BRL",
            "symbol": "R$"
        },
        {
            "code": "CAD",
            "symbol": "$"
        },
        {
            "code": "CHF",
            "symbol": "Fr."
        },
        {
            "code": "CLP",
            "symbol": "$"
        },
        {
            "code": "CNY",
            "symbol": "RMB"
        },
        {
            "code": "CZK",
            "symbol": "Kč"
        },
        {
            "code": "DKK",
            "symbol": "kr."
        },
        {
            "code": "EUR",
            "symbol": "€"
        },
        {
            "code": "GBP",
            "symbol": "£"
        },
        {
            "code": "HKD",
            "symbol": "HK$"
        },
        {
            "code": "HUF",
            "symbol": "Ft"
        },
        {
            "code": "IDR",
            "symbol": "Rp"
        },
        {
            "code": "ILS",
            "symbol": "₪"
        },
        {
            "code": "INR",
            "symbol": "₹"
        },
        {
            "code": "JPY",
            "symbool": "¥"
        },
        {
            "code": "KRW",
            "symbol": "₩"
        },
        {
            "code": "MXN",
            "symbol": "$"
        },
        {
            "code": "MYR",
            "symbol": "RM"
        },
        {
            "code": "NOK",
            "symbol": "kr"
        },
        {
            "code": "NZD",
            "symbol": "$"
        },
        {
            "code": "USD",
            "symbol": "$"
        },
        {
            "code": "PHP",
            "symbol": "₱"
        },
        {
            "code": "PKR",
            "symbol": "₨"
        },
        {
            "code": "PLN",
            "symbol": "zł"
        },
        {
            "code": "RUB",
            "symbol": "₽"
        },
        {
            "code": "SEK",
            "symbol": "kr"
        },
        {
            "code": "SGD",
            "symbol": "S$"
        },
        {
            "code": "THB",
            "symbol": "฿"
        },
        {
            "code": "TRY",
            "symbol": "₺"
        },
        {
            "code": "TWD",
            "symbol": "NT$"
        },
        {
            "code": "ZAR",
            "symbol": "R"
        }
    ]




    // build query to find user keys array
 /*   var userSettingsQuery = UserSettings.findOne({
        'user.id': req.user._id
    });

    var userCurrency = userSettingsQuery.exec(function (err, userSettingsObject) {
        if (err) return handleError(err);


        console.log("USER SETTINGS OBJECT IS NOW", userSettingsObject); */

        console.log("CALLING FIND USER SETTINGS FUNCTION WITH USER ID ", req.user._id);
        
        exports.findUserSettings(req.user._id, function(userSettingsObject) {
       

        console.log("USER SETTINGS OBJECT IS NOW", userSettingsObject);
  

        if (userSettingsObject == null) { 
            
            console.log("USER PROFILE DOES NOT EXIST");

            // pass USD if does not exist.

            res.render('settings.ejs', {
                user: req.user,
                exchangesArray: ccxt.exchanges,
                currencyArray: currencyArray,
                userCurrency: 'USD',
                userAutoCapture: 'No',
                userInterval: '30 mins',
                message: req.flash('info')
            });

        
        } else {

        userCurrency = userSettingsObject.settings.currency;

        userAutoCapture = userSettingsObject.settings.autocapture;

        userInterval = userSettingsObject.settings.interval;


        res.render('settings.ejs', {
            user: req.user,
            exchangesArray: ccxt.exchanges,
            currencyArray: currencyArray,
            userCurrency: userCurrency,
            userAutoCapture: userAutoCapture,
            userInterval: userInterval,
            message: req.flash('info')
        });
    }

});
  //  })

};
