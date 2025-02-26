const mongoose = require("mongoose");
const UserCapture = require('../models/userCapture');
const UserKey = require('../models/userKey');
const UserCoin = require('../models/userCoins');
const UserSettings = require('../models/userSettings');
const btcValue = require('btc-value');
const currencyFormatter = require('currency-formatter');
const uniqid = require('uniqid');
const moment = require('moment');
const ccxt = require('ccxt');
const async = require("async");

let userPortfolioArray, totalDollar, totalBTC, BTCPrice, userCurrency;

function resetGlobals() {
    userPortfolioArray = [];
    totalDollar = 0;
    totalBTC = 0;
    BTCPrice = 0;
}

async function fetchUserSettings(userID) {
    return new Promise((resolve, reject) => {
        UserSettings.findOne({ 'user.id': userID }, (err, settings) => {
            if (err) return reject(err);
            resolve(settings || { settings: { currency: 'USD' } });
        });
    });
}

async function fetchUserKeys(userID) {
    return new Promise((resolve, reject) => {
        UserKey.find({ 'user.id': userID }, (err, keys) => {
            if (err) return reject(err);
            resolve(keys);
        });
    });
}

async function fetchUserCoins(userID) {
    return new Promise((resolve, reject) => {
        UserCoin.find({ 'user.id': userID }, (err, coins) => {
            if (err) return reject(err);
            resolve(coins);
        });
    });
}

async function fetchPositiveAccounts(exchange, key, secret) {
    exchange.apiKey = key;
    exchange.secret = secret;
    exchange.enableRateLimit = true;

    try {
        const balance = await exchange.fetchBalance();
        return Object.fromEntries(Object.entries(balance.total).filter(([_, v]) => v > 0));
    } catch (e) {
        console.error(`[${e.constructor.name}] ${e.message}`);
        return {};
    }
}

async function fetchCoinPrice(exchange, ticker) {
    try {
        const { ask } = await exchange.fetchTicker(ticker);
        return ask;
    } catch (e) {
        console.error(`[${e.constructor.name}] ${e.message}`);
        return 0;
    }
}

async function processUserKeys(userKeys) {
    for (const { details: { exchange: exchangeName, key, secret } } of userKeys) {
        const exchange = new ccxt[exchangeName]();
        const positiveAccounts = await fetchPositiveAccounts(exchange, key, secret);
        await processBalance(exchange, key, secret, positiveAccounts);
    }
}

async function processBalance(exchange, key, secret, positiveAccounts) {
    for (const [currency, available] of Object.entries(positiveAccounts)) {
        const ticker = currency === 'BTC' ? 'BTC/USD' : `${currency}/BTC`;
        const coinPrice = await fetchCoinPrice(exchange, ticker);
        const coinValue = available * coinPrice;

        totalBTC += available;
        totalDollar += coinValue;

        userPortfolioArray.push({
            Exchange: exchange.name,
            Currency: currency,
            Available: available,
            CoinValue: coinValue,
            Price: coinPrice
        });
    }
}

exports.Portfolio = async function (req, res) {
    if (!req.user) {
        return res.render('view.ejs', { user: null, message: req.flash('info') });
    }

    resetGlobals();

    try {
        const userSettings = await fetchUserSettings(req.user._id);
        userCurrency = userSettings.settings.currency;

        const userKeys = await fetchUserKeys(req.user._id);
        const userCoins = await fetchUserCoins(req.user._id);

        if (!userKeys.length && !userCoins.length) {
            return renderPortfolio(req, res);
        }

        await processUserKeys(userKeys);
        renderPortfolio(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
};

function renderPortfolio(req, res) {
    userPortfolioArray.forEach(item => {
        item.portfolioPercentage = `${((item.DollarValueInt / totalDollar) * 100).toFixed(2)}%`;
    });

    const formattedTotalDollar = currencyFormatter.format(totalDollar, { code: userCurrency });
    const formattedTotalBTC = currencyFormatter.format(totalBTC, { code: 'BTC' });

    res.render('view.ejs', {
        user: req.user,
        userPortfolioArray,
        totalDollar: formattedTotalDollar,
        totalBTC: formattedTotalBTC,
        BTCPrice,
        datenow: moment().format("ddd DD-MM-YY, HH:mm:ss"),
        userCurrency,
        message: req.flash('info')
    });
}

exports.Create = async function (req, res) {
    try {
        const userSettings = await fetchUserSettings(req.user._id);
        userCurrency = userSettings.settings.currency;

        const newCapture = new UserCapture({
            user: { id: req.user._id },
            details: {
                name: req.body.capturename,
                date: new Date(),
                totaldollar: totalDollar,
                totalBTC: totalBTC,
                BTCPrice: BTCPrice,
                portfolio: userPortfolioArray,
                userCurrency: userCurrency
            }
        });

        await newCapture.save();

        req.flash('info', 'Captured portfolio successfully');
        res.redirect('/view');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
};

exports.View = async function (req, res) {
    if (!req.user) {
        return res.render('captures.ejs', { user: null, message: req.flash('info') });
    }

    try {
        const userCaptures = await UserCapture.find({ 'user.id': req.user._id });
        res.render('captures.ejs', { user: req.user, userCaptureArray: userCaptures, selectedCaptureArray: null });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
};