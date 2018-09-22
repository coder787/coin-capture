var mongoose = require("mongoose");
var UserCapture = require('../models/userCapture');
var UserKey = require('../models/userKey'); // for now do this but bad
var UserCoin = require('../models/userCoins');
var UserSettingsModel = require('../models/usersettings'); // for now do this but bad

var UserKeys = require("../controllers/userKeyController.js");
var UserSettings = require("../controllers/userSettingsController.js");
const btcValue = require('btc-value');
var currencyFormatter = require('currency-formatter');


// A Unique Hexatridecimal ID generator, It will always create unique id's based on the current time, process and machine name.
var uniqid = require('uniqid');

// A lightweight JavaScript date library for parsing, validating, manipulating, and formatting dates.
var moment = require('moment');

// A JavaScript / Python / PHP cryptocurrency trading library with support for more than 100 bitcoin/altcoin exchanges
const ccxt = require('ccxt');

// provides straight-forward, powerful functions for working with asynchronous JavaScript. 
var async = require("async");

// globals. bad idea. TO-DO : Get rid of these

var userPortfolioArray, totalDollar, totalBTC, BTCPrice, userCurrency


// reset global variables

function resetGlobals() {

    userPortfolioArray = [];
    totalDollar = 0;
    totalBTC = 0;
    BTCPrice = 0;

}

exports.Portfolio = async function (req, res) {

    console.log("STARTING PORTFOLIO FUNCTION");

    // check if user logged in

    if (req.user == null) {

        res.render('view.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {

        console.log("ABOUT TO GET USER SETTINGS");
        // get the users settings

        const userresult = await UserSettings.findUserSettings(req.user._id, function (userSettingsObject) {

            console.log("FOUND USER SETTINGS OF ", userSettingsObject);

            console.log("ABOUT TO GET USER CURRENCY");

            // get the users currency setting
            userCurrency = UserSettings.findUserCurrency(userSettingsObject);

            console.log("FOUND USER CURRENCY OF ", userCurrency);

        })

        console.log("RESETTING GLOBALS");
        resetGlobals();

        // find user keys

        console.log("FINDING USER KEYS");

        userKeysArray = UserKeys.FindUserKeys(req.user._id, function (userKeysArray) {

            console.log("USER KEYS FOUND ARE: ", userKeysArray);

        });


        // build query to find user keys array
        var userKeyQuery = UserKey.find({
            'user.id': req.user._id
        });

        // build query to find user coins array

        var userCoinQuery = UserCoin.find({
            'user.id': req.user._id
        })

        // execute the query then pass the results to be processed and rendered
        userKeyQuery.exec(function (err, userKeysArray) {

            console.log("user keys array is now ", userKeysArray);

            if (err) return handleError(err);

            userCoinQuery.exec(function (err, userCoinsArray) {

                console.log("user coins array is now ", userCoinsArray);

                if (err) return handleError(err);

                console.log("ABOUT TO CALL PROCESS COINS ", userCoinsArray);


                processcoins = processUserCoins(userCoinsArray, function (userPortfolioArray) {


                    console.log("FINISHED PROCESS COINS ", userCoinsArray);

                    keysarraycount = userKeysArray.length;

                    console.log("USER KEYS LENGTH IS: ", keysarraycount);

                    if (keysarraycount == 0) {
                        renderPortfolio(req, res);
                    } else {

                        async.each(userKeysArray, function (userKeyObject) {

                            currentExchange = userKeyObject.details.exchange;

                            console.log("passing to process user keys exchange: ", currentExchange);

                            keysresult = processUserKeys(userKeyObject, currentExchange, function (userPortfolioArray) {

                                renderPortfolio(req, res);
                                console.log("user portfolio now: ", userPortfolioArray);

                            })

                        })

                    }

                })

            })

        })
    }
};

async function processUserKeys(userKeyObject, currentExchange, callback) {

    console.log("in big function with userKeyObject: ", userKeyObject);

    counter = 0;

    //currentExchange = userKeyObject.details.exchange;
    currentKey = userKeyObject.details.key;
    currentSecret = userKeyObject.details.secret;

    console.log("1st get positive account from exchange: ", currentExchange);

    positiveAccObject = await fetchBalanceOneExchange(currentKey, currentSecret, currentExchange);

    console.log("2nd process positive account with positive account: ", positiveAccObject);

    resultObject = await processBalance(currentKey, currentSecret, currentExchange, positiveAccObject);

    counter++;

    console.log("comparing counter: " + counter + " and keysarraycount " + keysarraycount);

    if (counter == keysarraycount) {
        callback(userPortfolioArray);
    }

}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}


const getPositiveAccounts = function (balance) {
    console.log("in positive accounts function");
    const result = {}
    Object.keys(balance)
        .filter(currency => balance[currency] && (balance[currency] > 0))
        .forEach(currency => {
            result[currency] = balance[currency]
        })
    return result
}

// takes an exchange and returns the positive balance from that exchange
async function fetchBalanceOneExchange(currentKey, currentSecret, currentExchange) {

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
            // console.log("got account balance of: ", accountBalance);
        } else {
            var accountBalance = await exchange.fetchBalance({
                'recvWindow': 10000000
            })
            //  console.log("got binance account balance of: ", accountBalance);
        }

        positiveAccObject = await getPositiveAccounts(accountBalance.total);

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
    console.log("returning positive account object for exchange: " + currentExchange + " from fetch balance function: ", positiveAccObject);

    //positiveAccObject.Exchange = currentExchange;  //shouldn't have to do this.

    return positiveAccObject;

}

// takes an exchange and a cointicker and returns a coinobject ticker
async function fetchTickerforCoin(currentKey, currentSecret, currentExchange, cointicker) {

    // instantiate the current exchange
    let exchange = new ccxt[currentExchange]();

    exchange.apiKey = currentKey;
    exchange.secret = currentSecret;
    exchange.enableRateLimit = true;


    console.log("about to fetch ticker for: ", cointicker);
    try {
        let coinpriceObject = exchange.fetchTicker(cointicker);

        return coinpriceObject;
    } catch (e) {

        if (e instanceof ccxt.ExchangeError)
            console.log(Date.now(), e.constructor.name, e.message)

    }



}

// takes a positive account object and returns formatted version ready for rendering
async function processBalance(currentKey, currentSecret, currentExchange, positiveAccObject) {

    for (const [key, value] of Object.entries(positiveAccObject)) {

        var resultObject = {};

        console.log("IN PROCESS BALANCE SETTING EXCHANGE TO", currentExchange);

        resultObject.Exchange = currentExchange;
        resultObject.Currency = key;
        resultObject.Available = value;

        if (key != 'BTC') {

            if (currentExchange == 'coinbase') {
                var cointicker = key + '/USD';
            } else {
                var cointicker = key + '/BTC';
            };
            // let coinpriceObject = await exchange.fetchTicker(cointicker);


            try {

                let coinpriceObject = await fetchTickerforCoin(currentKey, currentSecret, currentExchange, cointicker);



                //let coinprice  = coinpriceObject.ask;
                console.log("calling getconverted value with currency code of USD");

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

            } catch (e) {

                if (e instanceof ccxt.ExchangeError) {

                    resultObject.CoinValue = 0; // set coinvalue to 0 if not found

                    console.log(Date.now(), e.constructor.name, e.message)

                }

            }


        } else {
            resultObject.CoinValue = resultObject.Available;
            resultObject.Price = 1; // price is 1 for bitcoin, so coin price gets calculated as 1 * btc price below
        }

        console.log("UPDATING TOTAL BTC WITH: ", resultObject.CoinValue);

        totalBTC += resultObject.CoinValue;

        console.log("calling getconverted value with currency code of ", userCurrency);

        btcresult = await btcValue.getConvertedValue(userCurrency).then(value => {
            console.log("DOLLAR VALUE CALC of COINVALUE: " + resultObject.CoinValue + " AND PRICE: " + value);

            console.log("USER CURRENCY IS NOW ", userCurrency);

            // integer values for coin price and dollar amount without currency formatting
            resultObject.PriceInt = resultObject.Price * value;

            resultObject.DollarValueInt = resultObject.CoinValue * value;

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

            console.log("TOTAL DOLLAR ADDING " + resultObject.CoinValue + " value " + value);

            totalDollar += resultObject.CoinValue * value;

        });


        console.log("3rd push result object using current exchange:", currentExchange);

        console.log("PUSHING RESULT OBJECT: ", resultObject);

        userPortfolioArray.push(resultObject);


    }

    return resultObject;

}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

// input a coin object and return the portfolio object

async function processUserCoinObject(CoinObject, callback) {

    console.log("STARTED COIN OBJECT PROCESSING OF COIN OBJECT: ", CoinObject);

    let portfolioObject = {}

    portfolioObject.Exchange = CoinObject.exchange;
    portfolioObject.Currency = CoinObject.coinsymbol;
    portfolioObject.Available = CoinObject.quantity;
    portfolioObject.CoinValue = CoinObject.price;

    btcresult = await btcValue.getConvertedValue(userCurrency).then(value => { //should be await

        console.log("COIN DOLLAR VALUE CALC of COINVALUE: " + portfolioObject.CoinValue + " AND PRICE: " + value);

        // integer dollar value
        portfolioObject.PriceINT = portfolioObject.CoinValue * value;

        // integer price value
        portfolioObject.DollarValueINT = (portfolioObject.CoinValue * portfolioObject.Available) * value;

        // get total price of coin in user currency
        formattedDollar = currencyFormatter.format(portfolioObject.CoinValue * value, {
            code: userCurrency
        });

        formattedUSDValue = currencyFormatter.format((portfolioObject.CoinValue * portfolioObject.Available) * value, {
            code: userCurrency
        });

        portfolioObject.Price = formattedDollar;

        portfolioObject.DollarValue = formattedUSDValue;

        console.log("TOTAL DOLLAR ADDING COIN VALUE: " + portfolioObject.CoinValue + " TIMES: " + value);

        //totalDollar += portfolioObject.CoinValue * value;  // how did this ever work

        totalDollar += portfolioObject.DollarValueINT;

        totalBTC += portfolioObject.DollarValueINT / value;

        console.log("RETURNING PORTOFOLIO OBJECT OF: ", portfolioObject);

        callback(portfolioObject);


    })



}


async function processUserCoins(userCoinsArray, callback) {

    console.log("STARTED COIN PROCESSING");
    // get objects from userCoinsArray
    CoinArray = userCoinsArray[0].coins
    console.log("GOT COIN ARRAY OF ", CoinArray);

    for (const element of CoinArray) {

        //CoinArray.forEach(function(element) {

        result = await ProcessCoin(element, callback);

    }


    console.log("RETURNING COIN PORTFOLIO ARRAY OF:", userPortfolioArray);

    callback(userPortfolioArray);

}

async function ProcessCoin(Coin) {

    portfolioObject = {}

    console.log("PROCESSING COIN OBJECT: ", Coin);

    portfolioObject = await processUserCoinObject(Coin, function (portfolioObject) {

        console.log("PUSHING PORTFOLIO OBJECT TO USER PORTFOLIO: ", portfolioObject);

        userPortfolioArray.push(portfolioObject);
    })
}


async function renderPortfolio(req, res) {

    console.log("in render portfolio with portfolio array: ", userPortfolioArray);

    //var currencies = require('currency-formatter/currencies');

    //console.log("CURRENCIES ARE", currencies);

    // console.log("USER CURRENCY IS NOW", userCurrency);
    totalDollar = currencyFormatter.format(totalDollar, {
        code: userCurrency,
    });


    totalBTC = currencyFormatter.format(totalBTC, {
        code: 'BTC'
    });



    // calculate total dollar, not working

    //totalDollar = userPortfolioArray.map(item => parseInt(item.DollarValue)).reduce((prev, next) => prev + next);


    var datenow = moment().format("ddd DD-MM-YY, HH:mm:ss");


    console.log("ABOUT TO RENDER WITH DATE: ", datenow);

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


function sum(numbers) {
    return numbers.reduce(function (a, b) {
        return a + b
    });
}


// create a user capture
exports.Create = async function (req, res) {

    // get the users currency setting
    console.log("ABOUT TO GET USER SETTINGS");
    // get the users settings

    const userresult = await UserSettings.findUserSettings(req.user._id, function (userSettingsObject) {

        console.log("FOUND USER SETTINGS OF ", userSettingsObject);

        console.log("ABOUT TO GET USER CURRENCY");

        // get the users currency setting
        userCurrency = UserSettings.findUserCurrency(userSettingsObject);

        console.log("FOUND USER CURRENCY OF ", userCurrency);

    })

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
    //})
};


// find a user capture
exports.View = function (req, res) {

    // check if user logged in

    if (req.user == null) {

        res.render('captures.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {

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
    }
};

// compare user captures
exports.Find = function (req, res) {

    if (req.user == null) {

        res.render('compare.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {



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
    }
};


exports.Search = function (req, res) {

    // build query to find user captures array
    var userCaptureQuery = UserCapture.find({
        'user.id': req.user._id
    });

    // exec the query
    userCaptureQuery.exec(function (err, userCaptureArray) {

        if (err) return handleError(err);


        // build query to find selected capture



        // strip out name from display which has date in brackets also
        captureName = req.body.capture.substring(0, req.body.capture.indexOf('(') - 1);

        console.log("Capture to find is now ", captureName);

        var selectedCaptureQuery = UserCapture.find({
            'user.id': req.user._id,
            'details.name': captureName
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
                user: req.user,
                selectedCaptureArray: selectedCaptureArray,
                userCaptureArray: userCaptureArray
            })
        });
    })

};

// input: capture name, output: capture array
exports.FindUserCapture = function (captureName) {

    var selectedCaptureQuery = UserCapture.find({
        'user.id': req.user._id,
        'details.name': captureName
    });

    // execute query to find selected capture

    var userCaptureSelected = selectedCaptureQuery.exec(function (err, selectedCaptureArray) {
        if (err) return handleError(err);

        return selectedCaptureArray;
    });
};

exports.Compare = function (req, res) {


    if (req.user == null) {

        res.render('compare.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {



        // overall goal: 
        //build a compareArray using the 2 selected captures

        // steps:
        // initialise compareArray and the objects that will go in it

        compareArray = [];

        compareArrayObject1 = {};
        compareArrayObject2 = {};
        compareArrayObject3 = {};

        // get 2 selected captures

        selectedCapture1 = req.body.capture1.substring(0, req.body.capture1.indexOf('(') - 1);
        selectedCapture2 = req.body.capture2.substring(0, req.body.capture2.indexOf('(') - 1);

        console.log("i've got captures with names: " + selectedCapture1 + " " + selectedCapture2);

        compareArrayObject1.captureName = selectedCapture1;
        compareArrayObject2.captureName = selectedCapture2;

        // find capture 1 in DB

        var selectedCaptureQuery = UserCapture.find({
            'user.id': req.user._id,
            'details.name': selectedCapture1
        });

        // execute query to find selected 1st capture

        var userCapture1 = selectedCaptureQuery.exec(function (err, CaptureArray1) {
            if (err) return handleError(err);

            console.log("user1 capture found is", CaptureArray1);

            console.log("length of capture1 portfolio is", CaptureArray1[0]['details']['portfolio'].length);

            // populate object with values from capture retrieved

            compareArrayObject1.CoinCount = CaptureArray1[0]['details']['portfolio']['length'] - 1;
            compareArrayObject1.TotalDollar = CaptureArray1[0]['details']['totaldollar'];

            var captureDate = moment(CaptureArray1[0]['details']['date']);
            var formatcaptureDate = captureDate.format('ddd DD MMM YYYY, HH:mm:ss');

            compareArrayObject1.Date = formatcaptureDate;
            compareArrayObject1.UserCurrency = CaptureArray1[0]['details']['userCurrency'];

            console.log("compareArrayObject1 is now ", compareArrayObject1);

            // push to array to be used when rendering

            compareArray.push(compareArrayObject1);

            //})


            // find capture 2 in DB

            var selectedCaptureQuery2 = UserCapture.find({
                'user.id': req.user._id,
                'details.name': selectedCapture2
            });

            // execute query to find selected 2nd capture

            var userCapture2 = selectedCaptureQuery2.exec(function (err, CaptureArray2) {
                if (err) return handleError(err);

                console.log("user2 capture found is", CaptureArray2);

                console.log("length of capture2 portfolio is", CaptureArray2[0]['details']['portfolio'].length);

                // populate object with values from capture retrieved

                compareArrayObject2.CoinCount = CaptureArray2[0]['details']['portfolio']['length'] - 1;
                compareArrayObject2.TotalDollar = CaptureArray2[0]['details']['totaldollar'];

                var captureDate = moment(CaptureArray2[0]['details']['date']);
                var formatcaptureDate = captureDate.format('ddd DD MMM YYYY, HH:mm:ss');

                compareArrayObject2.Date = formatcaptureDate;
                compareArrayObject2.UserCurrency = CaptureArray2[0]['details']['userCurrency'];

                console.log("compareArrayObject2 is now ", compareArrayObject2);

                // push to array to be used when rendering

                compareArray.push(compareArrayObject2);

                console.log("after pushing compareArray is now", compareArray);

                //})

                // build query to find user captures array
                var userCaptureQuery = UserCapture.find({
                    'user.id': req.user._id
                });

                // exec the query
                userCaptureQuery.exec(function (err, userCaptureArray) {

                    if (err) return handleError(err);

                    // populate differences object


                    unformatDollar1 = currencyFormatter.unformat(compareArray[0].TotalDollar, {
                        code: compareArray[0]['UserCurrency']
                    });
                    unformatDollar2 = currencyFormatter.unformat(compareArray[1].TotalDollar, {
                        code: compareArray[1]['UserCurrency']
                    });

                    console.log("DIFFERENCE CALC USING " + unformatDollar1 + " minus " + unformatDollar2);

                    unformatdif = unformatDollar2 - unformatDollar1;

                    console.log("unformatted dollar amounts are " + unformatDollar1 + " " + unformatDollar2);

                    compareArrayObject3.CoinDifference = Math.abs(parseInt(compareArray[0].CoinCount) - parseInt(compareArray[1].CoinCount));
                    compareArrayObject3.DollarDifference = currencyFormatter.format(unformatdif, {
                        code: compareArray[0]['UserCurrency']
                    });

                    var date1 = moment(compareArray[0].Date);
                    var date2 = moment(compareArray[1].Date);

                    dateDifference = date1.diff(date2, 'minutes');

                    // var date3 = Math.abs(date1 - date2);

                    //console.log("formatted dates are " + compareArray[0].Date + " " + compareArray[1].Date);
                    //console.log("unformatted dates are " + date1 + " " + date2);

                    compareArrayObject3.DateDifference = dateDifference + " min";

                    // push to array
                    compareArray.push(compareArrayObject3);

                    // find common coins (using exchange, currency, available)

                    function checkAvailability(arr, val) {
                        return arr.some(function (arrVal) {
                            return val === arrVal;
                        });
                    }

                    // clone arrays so oringals left untouched
                    var cloneCaptureArray1 = JSON.parse(JSON.stringify(CaptureArray1));
                    var cloneCaptureArray2 = JSON.parse(JSON.stringify(CaptureArray2));


                    // map out values we don't want to compare

                    var filterarray1 = cloneCaptureArray1[0]['details']['portfolio'].map(function (item) {
                        delete item.DollarValue;
                        delete item.CoinValue;
                        delete item.Price;
                        return item;
                    });

                    var filterarray2 = cloneCaptureArray2[0]['details']['portfolio'].map(function (item) {
                        delete item.DollarValue;
                        delete item.CoinValue;
                        delete item.Price;
                        return item;
                    });

                    console.log("Filtered array 1 is now ", filterarray1);
                    console.log("Filtered array 2 is now ", filterarray2);

                    // find values in both arrays


                    // Generic helper function that can be used for the three operations:        
                    const operation = (list1, list2, isUnion = false) =>
                        list1.filter(a => isUnion === list2.some(b => a.userId === b.userId));

                    // Following functions are to be used:
                    const inBoth = (list1, list2) => operation(list1, list2, true),
                        inFirstOnly = operation, //not used now but might come in handy
                        inSecondOnly = (list1, list2) => inFirstOnly(list2, list1); // not used now but might come in handy


                    console.log('inBoth:', inBoth(filterarray1, filterarray2));

                    inbothArray = inBoth(filterarray1, filterarray2);

                    inbothArray.forEach(function (element) {

                        CaptureArray1[0]['details']['portfolio'].forEach(function (element2) {

                            CaptureArray2[0]['details']['portfolio'].forEach(function (element3) {

                                if (element.Currency == element2.Currency && element.Exchange == element2.Exchange && element.Available == element2.Available) {

                                    //console.log("I made it here, now setting price to element2 price: ", element2.Price);
                                    element.price1 = element2.Price;
                                    element.dollarvalue1 = element2.DollarValue;

                                }

                                if (element.Currency == element3.Currency && element.Exchange == element3.Exchange && element.Available == element3.Available) {

                                    //console.log("I made it here, now setting price to element3 price:  ", element3.Price);
                                    element.price2 = element3.Price;
                                    element.dollarvalue2 = element3.DollarValue;

                                    //unformat so can calculate difference
                                    priceUnformat1 = currencyFormatter.unformat(element.price1, {
                                        code: CaptureArray1[0]['details']['userCurrency']
                                    });
                                    // use number 1 currency for now, have to deal with case when curriences are different.
                                    priceUnformat2 = currencyFormatter.unformat(element.price2, {
                                        code: CaptureArray1[0]['details']['userCurrency']
                                    });


                                    tempDifference = priceUnformat2 - priceUnformat1;


                                    element.difference = currencyFormatter.format(tempDifference, {
                                        code: CaptureArray1[0]['details']['userCurrency']
                                    });

                                    //unformat so can calculate difference
                                    priceUnformat1 = currencyFormatter.unformat(element.dollarvalue1, {
                                        code: CaptureArray1[0]['details']['userCurrency']
                                    });
                                    // use number 1 currency for now, have to deal with case when curriences are different.
                                    priceUnformat2 = currencyFormatter.unformat(element.dollarvalue2, {
                                        code: CaptureArray1[0]['details']['userCurrency']
                                    });

                                    tempdollarDifference = priceUnformat2 - priceUnformat1;


                                    element.dollardifference = currencyFormatter.format(tempdollarDifference, {
                                        code: CaptureArray1[0]['details']['userCurrency']
                                    });


                                }


                            })

                        })
                    })



                    console.log("inboth array is now", inbothArray);

                    //console.log("ABOUT TO RENDER WITH COMPARE ARRAY", compareArray);

                    categoryArray = [];

                    inbothArray.forEach(function (element) {

                        categoryArray.push('\'' + element.Currency + ' [' + element.Exchange + ']' + '\'');

                    })



                    console.log("ABOUT TO RENDER WITH category ARRAY", categoryArray);

                    //pass the captures to the view
                    res.render('compare.ejs', {
                        user: req.user,
                        userCaptureArray: userCaptureArray,
                        selectedCaptureArray1: CaptureArray1,
                        selectedCaptureArray2: CaptureArray2,
                        categoryArray: categoryArray,
                        compareArray: compareArray,
                        inbothArray: inbothArray
                    })
                })
            })
        })
    }
};

//delete a user capture

exports.DeleteGet = function (req, res) {

    if (req.user == null) {

        res.render('deletecaptures.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {



        // get users captures array so they can be displayed

        // build query to find user captures array
        var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // execute the query
        userCaptureQuery.exec(function (err, userCaptureArray) {

            if (err) return handleError(err);

            console.log("FOUND userCaptureArray of", userCaptureArray);

            res.render('deletecaptures.ejs', {
                user: req.user,
                userCaptureArray: userCaptureArray,
                message: req.flash('info')
            });
        });
    }
};


exports.Delete = function (req, res) {

    var ObjectId = require('mongoose').Types.ObjectId;

    // get users selection

    console.log("user selection is", req.body.capturetodelete);

    // extract the selected capture name from the selection

    var deletecaptureID = req.body.capturetodelete.substring(req.body.capturetodelete.indexOf('[') + 1, req.body.capturetodelete.indexOf(']'));

    console.log("CAPTURE TO DELETE NAME IS ", deletecaptureID);

    //var hex = /[0-9A-Fa-f]{6}/g;
    // deletecaptureID = (hex.test(deletecaptureID))? ObjectId(deletecaptureID) : deletecaptureID;


    // build deletion query

    var deletequery = {
        _id: new ObjectId(deletecaptureID)
    };

    console.log("deleting capture with delete query: ", deletequery);

    // execute the delete query
    UserCapture.deleteOne(deletequery, function (err) {
        if (err)
            throw err;
        console.log("deleted user capture");
    });

    req.flash('info', 'Capture ' + deletecaptureID + ' deleted successfully')
    res.redirect('/deletecaptures');

    /*
            res.render('deletecaptures.ejs', {
                user: req.user,
                userCaptureArray: userCaptureArray,
                message: req.flash('info', 'Capture ' + selectedCapture + ' deleted successfully')
            }); */



}


exports.autoCapturePortfolio = function () {

    userPortfolioArray = [];
    totalDollar = 0;
    totalBTC = 0;
    BTCPrice = 0;

    console.log("this is where I auto capture");

    // find users where auto-capture = yes
    var userSettingsAutoQuery = UserSettingsModel.find({
        'settings.autocapture': 'Yes'
    });

    userSettingsAutoQuery.exec(function (err, userSettingsAutoArray) {

        if (err) return handleError(err);
        console.log("user array with settings auto = yes are: ", userSettingsAutoArray);

        // find users to capture now based on their auto capture settings

        // userSettingsAutoArrayCaptureNow = FindUsersToCapture(userSettingsAutoArray);  // not working
        console.log("USER settings auto array is now ", userSettingsAutoArray);

        // for each user capture the portfolio
        userSettingsAutoArray.forEach(function (element) {

            currentuserID = element.user.id;
            userCurrency = element.settings.currency;

            console.log("finding keys and coins for current user: ", currentuserID);

            var userKeyQuery = UserKey.find({
                'user.id': currentuserID
            });

            var userCoinQuery = UserCoin.find({
                'user.id': currentuserID
            })

            // execute the query then pass the results to be processed
             userKeyQuery.exec(function (err, userKeysArray) {
                //  let userKeysArray = UserKeys.FindUserKeys(function(currentuserID) {;
                if (err) return handleError(err);
                console.log("found userKeysArray is now ", userKeysArray);

                userCoinQuery.exec(function (err, userCoinsArray) {

                    if (err) return handleError(err);
                    console.log("found current user coins array is now ", userCoinsArray);

                    //const processcoins = processUserCoins(userCoinsArray);

                    processcoins = processUserCoins(userCoinsArray, function (userPortfolioArray) {

                    keysarraycount = userKeysArray.length;

                    if (keysarraycount == 0) {
                        //renderPortfolio(req, res);
                    } else {

                    async.each(userKeysArray, function (userKeyObject) {

                        currentExchange = userKeyObject.details.exchange;

                        console.log("passing to process user keys exchange: ", currentExchange);

                        keysresult = processUserKeys(userKeyObject, currentExchange, function (userPortfolioArray) {

                            console.log("finished processing user keys about to capture");
                            createAutoCapture(currentuserID, userCurrency);
                        })


                        /* var sequentialStart = async function () {
                            console.log('==SEQUENTIAL START==');
                            console.log("starting process user coins");
                            const coinsarray = await processUserCoins(userCoinsArray);
                            console.log("starting process user keys");
                            const keysarray = await processUserKeys(userKeysArray);
                            console.log("starting save to DB");
                            const render = await createAutoCapture(currentuserID, userCurrency);
                        }

                        sequentialStart(); */

                                // execute the query then pass the results to be processed and rendered
    

                   })
                }

                })
            

                })


            })

        })
    })

}

async function createAutoCapture(currentuserID, userCurrency) {
    // create userportfolio object
    console.log("starting auto capture save!");

    console.log("portofolio array is now ", userPortfolioArray);

    // format the dollars and btc amounts, done before render also, but no render when auto saving


    totalDollar = currencyFormatter.format(totalDollar, {
        code: userCurrency,
    });


    totalBTC = currencyFormatter.format(totalBTC, {
        code: 'BTC'
    });


    // save to database

    var newCapture = new UserCapture();

    var uniqueid = uniqid();

    //var datenow = moment().format("ddd DD-MM-YY, HH:MM:SS");
    console.log("Creating new capture for user with id: ", currentuserID);

    newCapture.user.id = currentuserID;
    newCapture.details.name = 'auto capture-' + uniqueid;
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
        console.log("user capture auto saved to DB :", newCapture);
    })
}


exports.Manage = function (req, res) {


    // overall goal: retrieve array of all current user captures to pass to render


    // check if user logged in

    if (req.user == null) {

        res.render('managecaptures.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {

        // build query to find user captures array
        var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // exec the query
        userCaptureQuery.exec(function (err, allCaptureArray) {

            if (err) return handleError(err);

            console.log("all capture array is now ", allCaptureArray);


            res.render('managecaptures.ejs', {
                user: req.user,
                moment: moment,
                allCaptureArray: allCaptureArray
            });
        })
    }
}


exports.ViewCaptureID = function (req, res) {

    console.log('capture id to view is now: ', req.params.captureID);

    // find capture
    var ObjectId = require('mongoose').Types.ObjectId;

    var findquery = {
        _id: new ObjectId(req.params.captureID)
    };

    UserCapture.findOne(findquery, function (err, selectedCaptureArray) {
        if (err)
            throw err;
        console.log("found user capture: ", selectedCaptureArray);

        array = []

        array.push(selectedCaptureArray);

        // render view capture
        res.render('captures.ejs', {
            user: req.user,
            selectedCaptureArray: array,
            userCaptureArray: null
        })
    });
}

// given an array of all users with capture = yes return an array of users to capture now based on their auto capture interval setting

function FindUsersToCapture(userSettingsAutoArray) {


    // first get an array of users with the next run times based on their user setting.

    let userNextCaptureArray = userSettingsAutoArray.map(element => {

        return {
            user: element.user.id,
            currency: element.settings.currency,
            nextCaptureTime: getNextCaptureTime(CronParseInterval(element.settings.interval)),
        };

    });

    console.log("userNextCaptureArray is now: ", userNextCaptureArray);

    let capturenowArray = getCapturenow(userNextCaptureArray);
    console.log("capture now array is now: ", capturenowArray);
    return capturenowArray;


}


// given a time interval convert this to a cron job string.
function CronParseInterval(timeInterval) {

    switch (timeInterval) {
        case '30 mins':
            return '0 */30 * * * *';
        case '1 hour':
            return '0 0 */1 * * *';
        case '2 hours':
            return '0 0 */2 * * *';
        case '3 hours':
            return '0 0 */3 * * *';
        case '4 hours':
            return '0 0 */4 * * *';
        case '5 hours':
            return '0 0 */5 * * *';
        case '6 hours':
            return '0 0 */6 * * *';
        case '7 hours':
            return '0 0 */7 * * *';
        case '8 hours':
            return '0 0 */8 * * *';
        case '9 hours':
            return '0 0 */9 * * *';
        case '10 hours':
            return '0 0 */10 * * *';
        case '11 hours':
            return '0 0 */11 * * *';
        case '12 hours':
            return '0 0 */12 * * *';

    }
}

// input a cron string eg: '0 */30 * * * *' and returns the next capture time.
function getNextCaptureTime(cronString) {

    var parser = require('cron-parser');

    try {
        var interval = parser.parseExpression(cronString);
        return interval.next().toString();
    } catch (err) {
        console.log('Error: ' + err.message);
    }


}

// input array of users with next capture dates, output array of ones to run now
function getCapturenow(userNextCaptureArray) {

    currentDateCheck = new Date();

    currentDateParse = Date.parse(currentDateCheck);

    console.log("current date check parse is now ", currentDateParse);
    console.log("current date check parse minus 100000 is now ", currentDateParse - 100000);
    console.log("current date check parse plus 100000 is now ", currentDateParse + 100000);



    let captureNowArray = userNextCaptureArray.filter(element => Date.parse(element.NextCaptureTime) > currentDateParse - 100000 && Date.parse(element.NextCaptureTime) < currentDateParse + 100000)

    return captureNowArray;

}


exports.Charts = function (req, res) {

    // check if user logged in

    if (req.user == null) {

        res.render('charts.ejs', {
            user: null,
            message: req.flash('info')

        })
    } else {



        // build query to find user captures array
        var userCaptureQuery = UserCapture.find({
            'user.id': req.user._id
        });

        // exec the query
        userCaptureQuery.exec(function (err, allCaptureArray) {

            if (err) return handleError(err);

            console.log("all capture array is now ", allCaptureArray);

            totalDollarArray = allCaptureArray.map(element => {

                return currencyFormatter.unformat(element.details.totaldollar, {
                    code: element.details.userCurrency
                });
            });


            console.log("about to render with total dollar array: ", totalDollarArray);

            res.render('charts.ejs', {
                user: req.user,
                totalDollarArray: totalDollarArray
            })
        })

    }
}