var mongoose = require("mongoose");
var UserKey = require('../models/userKey');


// create a user key
exports.Create = function (req, res) {

    // get a friendly format date time for use when saving keys
    var moment = require('moment');
    var datenow = moment();

    var newUserKey = new UserKey();

    newUserKey.user.id = req.user._id;
    newUserKey.details.exchange = req.body.exchange;
    newUserKey.details.key = req.body.key;
    newUserKey.details.secret = req.body.secret;
    newUserKey.details.added = datenow;

    newUserKey.save(function (err) {
        if (err)
            throw err;
        // return done(null, newUserKey);
        console.log("saved user key to DB :", newUserKey);
    });

    req.flash('info', 'Keys saved successfully');
    res.redirect('/enter');

};


//remove this now TODO, moved to userprofilecontroller
// find a user key
exports.Find = function (req, res) {

    console.log("LOOKING FOR", req.user._id);

    // build query to find user keys array
    var userKeyQuery = UserKey.find({
        'user.id': req.user._id
    });

    // execute the query
    userKeyQuery.exec(function (err, userKeysArray) {

        if (err) return handleError(err);

        console.log("FOUND userKeysArray of", userKeysArray);

        console.log("UserKeyArray exchange is now", userKeysArray[0].details.exchange);

        res.render('profile.ejs', {
            user: req.user, // get the user out of session and pass to template
            userKeysArray: userKeysArray
        });
    })
};

// get delete keys page and populate menus
exports.DeleteGet = function (req, res) {


    if (req.user == null) {

        res.render('deletekeys.ejs', {
            user: null,
            message: req.flash('info')
    
        })
     } else {


    // get users keys array so they can be displayed

    // build query to find user keys array
    var userKeyQuery = UserKey.find({
        'user.id': req.user._id
    });

    // execute the query
    userKeyQuery.exec(function (err, userKeysArray) {

        if (err) return handleError(err);
    
        console.log("FOUND userKeysArray of", userKeysArray);

    res.render('deletekeys.ejs', {
        user: req.user,
        userKeysArray: userKeysArray,
        message: req.flash('info')
    });
});
     }
};


exports.Delete = function (req, res) {

    // build query to find user keys array
    var userKeyQuery = UserKey.find({
        'user.id': req.user._id
    });

    // execute the query
    userKeyQuery.exec(function (err, userKeysArray) {

    // get users selection

    console.log("user selection is", req.body.keytodelete);

    var apiKey = req.body.keytodelete.substring( req.body.keytodelete.indexOf( '(' ) + 1, req.body.keytodelete.indexOf( ')' ) );

    console.log("API KEY TO DELETE IS ", apiKey);

    // query to find the selected key

        var deletequery = { 'details.key' : apiKey };

        // using the query delete the key

        UserKey.deleteOne(deletequery, function (err) {
            if (err)
                throw err;
            console.log("deleted user key");
        });

/*
    res.render('deletekeys.ejs', {
        user: req.user,
        userKeysArray: userKeysArray,
        message: req.flash('info', 'Key deleted successfully')
    }); */


    req.flash('info', 'Key ' + apiKey + ' deleted successfully')
                res.redirect('/deletekeys');

});
};

// given a user id returns an array of keys for that user.
exports.FindUserKeys = function(userID, callback) {

    console.log("in find user keys function looking for userkey with userid: ", userID);

    var userKeyQuery = UserKey.find({
        'user.id': userID
    });

    //console.log("userKeyQuery to execute is now ", userKeyQuery);

    userKeyQuery.exec(function (err, userKeysArray) {

      //  if (err) return handleError(err);
      if (err) console.log(err);
        console.log("found current user keys array is now ", userKeysArray);
    callback(userKeysArray);

    //return userKeysArray;

})
}