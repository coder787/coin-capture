var UserKey = require('../models/userKey');
var UserCoin = require('../models/userCoins');


// find a user key
exports.Show= function (req, res) {

    console.log("LOOKING FOR", req.user._id);

    // build query to find user keys array
    var userKeyQuery = UserKey.find({
        'user.id': req.user._id
    });

    // execute the query
    userKeyQuery.exec(function (err, userKeysArray) {

        if (err) return handleError(err);

        // build query to find user coins array

        var userCoinQuery = UserCoin.find({
            'user.id': req.user._id
        })

        // execute the query

        userCoinQuery.exec(function (err, userCoinsArray) {

            if (err) return handleError(err);

        console.log("FOUND userKeysArray of", userKeysArray);
        console.log("FOUND userCoinsArray of", userCoinsArray);
          
          console.log('user coins array length is now ', userCoinsArray.length);
          
          if (userCoinsArray.length > 0) {

        console.log("user coins length are  now", userCoinsArray[0]['coins'].length);


        res.render('profile.ejs', {
            user: req.user, // get the user out of session and pass to template
            userKeysArray: userKeysArray,
            userCoinsArray: userCoinsArray[0].coins
        });
          } else {
            res.render('profile.ejs', {
            user: req.user, // get the user out of session and pass to template
            userKeysArray: userKeysArray,
            userCoinsArray: userCoinsArray
        });
          }

    })
})
};