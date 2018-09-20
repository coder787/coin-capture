const ccxt = require('ccxt');

var UserCoin = require('../models/userCoins');
var moment = require('moment');


// when pressing save button on add coins page re-render with next menu or save to DB
exports.Process = function (req, res) {

    var exchangesArray = ccxt.exchanges;


    console.log("req body is now ", req.body);


    console.log("processing coin input");

    console.log("exchange is now ", req.body.exchange);
    console.log("coin selected is now ", req.body.coinsymbol);
    console.log("quantity selected is now ", req.body.quantity);
    console.log("coin selected is now ", req.body.CoinSelection);

    if (req.body.exchange != null && req.body.quantity == '') {

        selectedExchange = req.body.exchange;

        console.log("Exchange selected is im here ", req.body.exchange);

        (async function () {

            let exchange = new ccxt[selectedExchange]();

            //console.log("getting market for exchange: ", exchange);

            try {

                var exchangeMarket = await exchange.loadMarkets()

            } catch (e) {


                console.log('--------------------------------------------------------')
                console.log(e.constructor.name, e.message)
                console.log('--------------------------------------------------------')
                console.log(exchange.last_http_response)
                console.log('Failed.')

                console.log("about to redirect with error message");

                req.flash('info', 'Failed with message: ' + e.message);

                res.redirect('/manual');


            }

            if (exchangeMarket != null) {

                var values = Object.values(exchangeMarket);

                //console.log("values are: ", values);

                var coinArray = [];

                values.forEach(function (element) {

                    coinArray.push(element.base);
                })

                //console.log("coinArray is now ", coinArray);

                let dupCoinarray = [...new Set(coinArray)]; // take out duplicates

                dupCoinarray.sort();

                //console.log("dupcoinArray is now ", dupCoinarray);



                res.render('manual.ejs', {
                    user: req.user,
                    selectedExchange: selectedExchange,
                    exchangesArray: exchangesArray,
                    dupCoinarray: dupCoinarray,
                    message: req.flash('info')
                });


            }

        })();
    }


    if (req.body.exchange != null && req.body.coinsymbol != null && req.body.quantity != '') {

        // save to DB

        // check if exists

        findUserCoins(req.user._id, function (userCoinsObject) {


            if (userCoinsObject == null) {
                // does not exist, create new usercoin model, save to db

                console.log("im here about to save to db");

                var newUserCoin = new UserCoin();

                newUserCoin.user.id = req.user._id;

                // array to hold user coins
                userCoinsArray = [];

                // user coins object to push into array
                newuserCoinsObject = {};

                var datenow = moment();

                newuserCoinsObject.exchange = req.body.exchange;
                newuserCoinsObject.coinsymbol = req.body.coinsymbol;
                newuserCoinsObject.quantity = req.body.quantity;
                newuserCoinsObject.dateadded = datenow; // not working TO-DO fix format

                // find current price of coin based on exchange and coin

                getCoinPrice(req.body.exchange, req.body.coinsymbol, function (CoinAskPrice) {

                    console.log("using coin price ask of ", CoinAskPrice);

                    newuserCoinsObject.price = CoinAskPrice;

                    userCoinsArray.push(newuserCoinsObject);


                    console.log("user coins array is now ", userCoinsArray);

                    // put the array in the model ready for saving
                    newUserCoin.coins = userCoinsArray;

                    console.log("newUserCoin before saving is ", newUserCoin);

                    newUserCoin.save(function (err) {

                        if (err) throw err

                        console.log("saved user coin to DB :", newUserCoin);

                    })

                    req.flash('info', 'Coin saved successfully');
                    res.redirect('/manual');

                })

            } else {
                // update user coin array


                // build new object to add
                newuserCoinsObject = {};

                var datenow = moment();

                newuserCoinsObject.exchange = req.body.exchange;
                newuserCoinsObject.coinsymbol = req.body.coinsymbol;
                newuserCoinsObject.quantity = req.body.quantity;
                newuserCoinsObject.dateadded = datenow;

                // find current price of coin based on exchange and coin

                getCoinPrice(req.body.exchange, req.body.coinsymbol, function (CoinAskPrice) {

                    console.log("using coin price ask of ", CoinAskPrice);

                    newuserCoinsObject.price = CoinAskPrice;

                    // get existing user coins
                    existingUserCoinsArray = userCoinsObject.coins;

                    // add new object to existing
                    existingUserCoinsArray.push(newuserCoinsObject);

                    // now update the DB with new array
                    UserCoin.update({
                        'user.id': req.user._id
                    }, {
                        'coins': existingUserCoinsArray
                    }, function (err) {
                        if (err)
                            throw err;

                        console.log("updated settings to DB", UserCoin);

                        req.flash('info', 'Coin saved successfully')
                        res.redirect('/manual');

                    })

                })

            }
        });
    }
}

// given an exchange and coinsymbol returns the asking price of the coin.

async function getCoinPrice(exchangeforTicker, coinsymbol, callback) {

    let exchange = new ccxt[exchangeforTicker]();

    // console.log("exchange for ticker is now ", exchange);

    let coinpriceObject = await exchange.fetchTicker(coinsymbol + '/BTC');

    console.log("coinpriceobject returned is now ", coinpriceObject);

    console.log("using coin price ask of ", coinpriceObject.ask);

    callback(coinpriceObject.ask);

}


// given a user ID return the user coins object
function findUserCoins(userID, callback) {

    console.log("IN FUNCTION LOOKING FOR USER ID ", userID);
    // build query to find user coins array
    var userCoinsQuery = UserCoin.findOne({
        'user.id': userID
    });

    // exec the query and return the result as callback
    var userCoin = userCoinsQuery.exec(function (err, userCoinsObject) {
        if (err) return handleError(err);
        console.log("RETURNING ", userCoinsObject);
        callback(userCoinsObject);
    });
};


exports.DeleteGet = function (req, res) {

    if (req.user == null) {

        res.render('deletecoins.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {



        // get users coins array so they can be displayed

        // build query to find user coins array
        var userCoinQuery = UserCoin.find({
            'user.id': req.user._id
        });

        // execute the query
        userCoinQuery.exec(function (err, userCoinsArray) {

            if (err) return handleError(err);

            console.log("FOUND userCoinsArray of", userCoinsArray);


            if (userCoinsArray != null) {

                console.log("passing userCoinsArray to render: ", userCoinsArray[0].coins);

                res.render('deletecoins.ejs', {
                    user: req.user,
                    userCoinsArray: userCoinsArray[0].coins,
                    message: req.flash('info')
                });
            } else {
                res.render('deletecoins.ejs', {
                    user: req.user,
                    userCoinsArray: null,
                    message: req.flash('info')
                });


            }



        });
    }
}

exports.Delete = function (req, res) {

    // build query to find user coins array
    var userCoinQuery = UserCoin.find({
        'user.id': req.user._id
    });

    // execute the query
    userCoinQuery.exec(function (err, userCoinsArray) {

        // get users selection

        console.log("user selection is", req.body.cointodelete);

        var selectedCoin = req.body.cointodelete.substring(0, req.body.cointodelete.indexOf('(') - 1);

        console.log("COIN TO DELETE IS ", selectedCoin);


        // remove matching coin array item but keep everything else in DB

        UserCoin.update({
            'user.id': req.user._id
        }, {
            $pull: {
                'coins': {
                    'coinsymbol': selectedCoin
                }
            }
        }, function (err) {
            if (err)
                throw err;
            console.log("removed user coin");
        });


        req.flash('info', 'Deleted coin ' + selectedCoin + ' successfully')
        res.redirect('/deletecoins')

        /*
            res.render('deletecoins.ejs', {
                user: req.user,
                userCoinsArray: userCoinsArray,
                message: req.flash('info', 'Coin deleted successfully')
            }); */
    });
};