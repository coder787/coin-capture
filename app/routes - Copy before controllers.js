// app/routes.js
var currencyFormatter = require('currency-formatter');
var UserKey = require('../app/models/userkey');
var UserSettings = require('../app/models/usersettings');
var UserCapture = require('../app/models/usercapture');
var async = require("async");
const btcValue = require('btc-value');


module.exports = function (app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function (req, res) {
        res.render('index.ejs', {
            user: req.user
        }); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function (req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', {
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
    app.get('/profile', isLoggedIn, function (req, res) {

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
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    // =====================================
    // ENTER COINS =========================
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
    // VIEW COINS ==========================
    // =====================================
    app.get('/view', function (req, res) {

        // get the users currency setting

        // build query to find user keys array
        var userSettingsQuery = UserSettings.findOne({
            'user.id': req.user._id
        });

        var userCurrency = userSettingsQuery.exec(function (err, userSettingsObject) {
            if (err) return handleError(err);

            userCurrency = userSettingsObject.settings.currency;
        })


        userPortfolioArray = [];
        totalDollar = 0;
        totalBTC = 0;
        BTCPrice = 0;

        const ccxt = require('ccxt');

        const getPositiveAccounts = function (balance) {
            const result = {}
            Object.keys(balance)
                .filter(currency => balance[currency] && (balance[currency] > 0))
                .forEach(currency => {
                    result[currency] = balance[currency]
                })
            return result
        }

        // build query to find user keys array
        var userKeyQuery = UserKey.find({
            'user.id': req.user._id
        });


        // function that does async call to extract coins and totals from users exchanges
        async function processUserKeys(userKeysArray) {

            for (let element of userKeysArray) {

                currentExchange = element.details.exchange;
                currentKey = element.details.key;
                currentSecret = element.details.secret;


                // instantiate the current exchange
                let exchange = new ccxt[currentExchange]();

                exchange.apiKey = currentKey;
                exchange.secret = currentSecret;
                exchange.enableRateLimit = true;
                //exchange.verbose = true;

                //get the balance for the exchange
                console.log("getting balance for exchange: ", currentExchange);



                try {
                    if (currentExchange != 'binance') {
                        var accountBalance = await exchange.fetchBalance({
                            type: 'account'
                        })
                    } else var accountBalance = await exchange.fetchBalance({'recvWindow': 10000000})


                    console.log("got accountbalance of " + accountBalance + "from: " + currentExchange);

                    currencyArray = Object.keys(getPositiveAccounts(accountBalance.total));
                    valueArray = Object.values(getPositiveAccounts(accountBalance.total));

                    console.log("currency array is now", currencyArray);
                    console.log("value array is now", valueArray);

                    var comboObject = {}

                    currencyArray.forEach((key, i) => comboObject[key] = valueArray[i]);

                    for (const [key, value] of Object.entries(comboObject)) {

                        var resultObject = {};

                        resultObject.Exchange = currentExchange;
                        resultObject.Currency = key;
                        resultObject.Available = value;

                        if (key != 'BTC') {

                            if (currentExchange == 'coinbase') {
                                var cointicker = key + '/USD';
                            } else {
                                var cointicker = key + '/BTC';
                            };
                            let coinpriceObject = await exchange.fetchTicker(cointicker);

                            //let coinprice  = coinpriceObject.ask;


                            USDbtcresult = await btcValue.getConvertedValue('USD').then(value => {

                                if (currentExchange == 'coinbase') {

                                    var coinprice = coinpriceObject.ask / value;
                                    resultObject.Price = coinprice;
                                    console.log("SETTING COIN VALUE OF ", resultObject.Available * coinprice);
                                    resultObject.CoinValue = resultObject.Available * coinprice;
                                } else {
                                    var coinprice = coinpriceObject.ask;
                                    resultObject.Price = coinprice;
                                    console.log("SETTING COIN VALUE OF ", resultObject.Available * coinprice);
                                    resultObject.CoinValue = resultObject.Available * coinprice;
                                }

                            });





                        } else {
                            resultObject.CoinValue = resultObject.Available;
                            resultObject.Price = 1;  // price is 1 for bitcoin, so coin price gets calculated as 1 * btc price below
                        }


                        totalBTC += resultObject.CoinValue;

                        



                        btcresult = await btcValue.getConvertedValue(userCurrency).then(value => {
                            console.log("DOLLAR VALUE CALC of COINVALUE: " + resultObject.CoinValue + " AND PRICE: " + value);

                            

                            // convert btc price of coin to dollar value based on user currency
                            resultObject.Price = currencyFormatter.format(resultObject.Price * value, {
                                code: userCurrency

                            });

                            // get total price of coin in user currency
                            formattedDollar = currencyFormatter.format(resultObject.CoinValue * value, {
                                code: userCurrency
                            });

                            // format the btc price and set it to be saved into capture
                            BTCPrice = currencyFormatter.format(value, {
                                code: userCurrency
                            });

                            resultObject.DollarValue = formattedDollar;
                            totalDollar += resultObject.CoinValue * value;

                        });

                        

                        userPortfolioArray.push(resultObject);

                    }

                } catch (e) {

                    if (e instanceof ccxt.DDoSProtection || e.message.includes('ECONNRESET')) {
                        console.log('[DDoS Protection] ' + e.message)
                    } else if (e instanceof ccxt.RequestTimeout) {
                        console.log('[Request Timeout] ' + e.message)
                    } else if (e instanceof ccxt.AuthenticationError) {
                        console.log('[Authentication Error] ' + e.message)
                    } else if (e instanceof ccxt.ExchangeNotAvailable) {
                        console.log('[Exchange Not Available Error] ' + e.message)
                    } else if (e instanceof ccxt.ExchangeError) {
                        console.log('[Exchange Error] ' + e.message)
                    } else if (e instanceof ccxt.NetworkError) {
                        console.log('[Network Error] ' + e.message)
                    } else {
                        throw e
                    }
                }
            }
        }


        async function renderPortfolio() {

            //var currencies = require('currency-formatter/currencies');

            //console.log("CURRENCIES ARE", currencies);

            console.log("USER CURRENCY IS NOW", userCurrency);
            totalDollar = currencyFormatter.format(totalDollar, {
                code: userCurrency,
            });


            totalBTC = currencyFormatter.format(totalBTC, {
                code: 'BTC'
            });


            var moment = require('moment');

            var datenow = moment();

            res.render('view.ejs', {
                user: req.user,
                userPortfolioArray: userPortfolioArray,
                totalDollar: totalDollar,
                totalBTC: totalBTC,
                BTCPrice: BTCPrice,
                datenow: datenow,
                userCurrency: userCurrency,
                message: req.flash('info') 
            });
        }

        // execute the query then pass the results to be processed and rendered
        userKeyQuery.exec(function (err, userKeysArray) {

            if (err) return handleError(err);

            processUserKeys(userKeysArray)
                .then(renderPortfolio);


        })
    });

    // =====================================
    // CAPTURES ============================
    // =====================================
    app.get('/captures', function (req, res) {

        // find user captures if it exists

        // build query to find user captures array
        var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // exec the query
        userCaptureQuery.exec(function (err, userCaptureArray) {

            if (err) return handleError(err);

            //pass the captures to the view
            res.render('captures.ejs', {
                user: req.user,
                userCaptureArray: userCaptureArray,
                selectedCaptureArray: null
            })
        })
    });

    // =====================================
    // COMPARE ============================
    // =====================================
    app.get('/compare', function (req, res) {

        // build query to find user captures array
        var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // exec the query
        userCaptureQuery.exec(function (err, userCaptureArray) {

            if (err) return handleError(err);

            //pass the captures to the view
            res.render('compare.ejs', {
                user: req.user,
                userCaptureArray: userCaptureArray,
                compareArray: null
            })
        })
    });


    // =====================================
    // SETTINGS ============================
    // =====================================
    app.get('/settings', function (req, res) {

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
        var userSettingsQuery = UserSettings.findOne({
            'user.id': req.user._id
        });

        var userCurrency = userSettingsQuery.exec(function (err, userSettingsObject) {
            if (err) return handleError(err);


            console.log("USER CURRENCY OBJECT IS NOW", userSettingsObject);


            userCurrency = userSettingsObject.settings.currency;

            res.render('settings.ejs', {
                user: req.user,
                exchangesArray: app.locals.exchangesArray,
                currencyArray: currencyArray,
                userCurrency: userCurrency,
                message: req.flash('info')
            });
        })
    });

    // process the settings form
    app.post('/addsettings', function (req, res) {

        // find user currency, if exists update, if not then save new

        // find if there is an existing user currency

        console.log("building query to search for user currency");

        var userSettingsQuery = UserSettings.findOne({
            'user.id': req.user._id
        });

        console.log("executing query to search for user currency");
        var userCurrency = userSettingsQuery.exec(function (err, userSettingsObject) {
            if (err) return handleError(err);


            console.log("USER CURRENCY OBJECT IS NOW", userSettingsObject);


            userCurrency = userSettingsObject.settings.currency;


            console.log("user currency found is now", userCurrency);

            // check if exists
            if (userCurrency == null) {
                console.log("does not exist, so creating");
                // does not exist. so create and save
                var newUserSettings = new UserSettings();

                newUserSettings.user.id = req.user._id;
                newUserSettings.settings.currency = req.body.currency;

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
                    'settings.currency': req.body.currency
                }, function (err) {
                    if (err)
                        throw err;

                    console.log("updated settings to DB", UserSettings);

                    req.flash('info', 'Updated settings')
                    res.redirect('/settings');

                })

            }

        })

    });


    // process the enter form
    app.post('/addkeys', function (req, res) {

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
    });

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

    app.post('/capture', function (req, res) {


        // get users currency setting
        var userSettingsQuery = UserSettings.findOne({
            'user.id': req.user._id
        });

        var userCurrency = userSettingsQuery.exec(function (err, userSettingsObject) {
            if (err) return handleError(err);

            userCurrency = userSettingsObject.settings.currency;

        // create userportfolio object
        console.log("portofolio array is now ", userPortfolioArray);

        console.log("CaptureName is now", req.body.capturename);
        // save to database

        var newCapture = new UserCapture();

        newCapture.user.id = req.user._id;
        newCapture.details.name = req.body.capturename;
        newCapture.details.date = new Date();
        newCapture.details.totaldollar = totalDollar;
        newCapture.details.totalBTC = totalBTC;
        newCapture.details.BTCPrice = BTCPrice;
        newCapture.details.portfolio = userPortfolioArray;
        newCapture.details.userCurrency = userCurrency

        

        newCapture.save(function (err) {
            if (err)
                throw err;
            // return done(null, newUserKey);
            console.log("user portfolio saved to DB :", newCapture);

            req.flash('info', 'Captured portfolio successfuly')
            res.redirect('/view');

        });
    })
    })


    app.post('/viewcapture', function (req, res) {

        // build query to find user captures array
        var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // exec the query
        userCaptureQuery.exec(function (err, userCaptureArray) {

            if (err) return handleError(err);
        

       // build query to find selected capture

        console.log("selected capture is with name: ", req.body.capture);


        var selectedCaptureQuery = UserCapture.find({
            'user.id': req.user._id,
            'details.name' : req.body.capture
        });

        // execute query to find selected capture

        var userCaptureSelected = selectedCaptureQuery.exec(function (err, selectedCaptureArray) {
            if (err) return handleError(err);

            console.log("user capture found is", selectedCaptureArray);

            console.log("user capture found is with details", selectedCaptureArray[0]['details']);

            // render it

            //res.redirect('/captures.ejs');

            // pass both all users captures and selected capture to render
            res.render('captures.ejs', {
                user: req.user._id,
                selectedCaptureArray : selectedCaptureArray,
                userCaptureArray: userCaptureArray
            })
            });
        })
    })

    app.post('/comparecapture', function (req, res) {

        // overall goal: 
        //build a compareArray using the 2 selected captures

        // steps:
        // initialise compareArray and the objects that will go in it

        compareArray = [];

        compareArrayObject1 = {};
        compareArrayObject2 = {};

        // get 2 selected captures

        selectedCapture1 = req.body.capture1;
        selectedCapture2 = req.body.capture2;

        console.log("i've got captures with names: " + selectedCapture1 + " " + selectedCapture2);

        compareArrayObject1.captureName = req.body.capture1;
        compareArrayObject2.captureName = req.body.capture2;

        // find capture 1 in DB

        var selectedCaptureQuery = UserCapture.find({
            'user.id': req.user._id,
            'details.name' : selectedCapture1
        });

        // execute query to find selected 1st capture

        var userCapture1 = selectedCaptureQuery.exec(function (err, CaptureArray1) {
            if (err) return handleError(err);

            console.log("user1 capture found is", CaptureArray1);

            console.log("length of capture1 portfolio is", CaptureArray1[0]['details']['portfolio'].length);

            // populate object with values from capture retrieved

            compareArrayObject1.CoinCount = CaptureArray1[0]['details']['portfolio']['length'] - 1;
            compareArrayObject1.TotalDollar = CaptureArray1[0]['details']['totaldollar'];
            compareArrayObject1.Date = CaptureArray1[0]['details']['date'];

            console.log("compareArrayObject1 is now ", compareArrayObject1);

            // push to array to be used when rendering

            compareArray.push(compareArrayObject1);

        })


        // find capture 2 in DB

        var selectedCaptureQuery2 = UserCapture.find({
            'user.id': req.user._id,
            'details.name' : selectedCapture2
        });

        // execute query to find selected 2nd capture

        var userCapture2 = selectedCaptureQuery2.exec(function (err, CaptureArray2) {
            if (err) return handleError(err);

            console.log("user2 capture found is", CaptureArray2);

            console.log("length of capture2 portfolio is", CaptureArray2[0]['details']['portfolio'].length);

            // populate object with values from capture retrieved

            compareArrayObject2.CoinCount = CaptureArray2[0]['details']['portfolio']['length'] - 1;
            compareArrayObject2.TotalDollar = CaptureArray2[0]['details']['totaldollar'];
            compareArrayObject2.Date = CaptureArray2[0]['details']['date'];

            console.log("compareArrayObject2 is now ", compareArrayObject2);

            // push to array to be used when rendering

            compareArray.push(compareArrayObject2);

            console.log("after pushing compareArray is now", compareArray);

        })

         // build query to find user captures array
         var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // exec the query
        userCaptureQuery.exec(function (err, userCaptureArray) {

            if (err) return handleError(err);


            console.log("ABOUT TO RENDER WITH COMPARE ARRAY", compareArray);
            
            //pass the captures to the view
            res.render('compare.ejs', {
                user: req.user,
                userCaptureArray: userCaptureArray,
                compareArray: compareArray
            })
        })

    })

}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}