const mongoose = require("mongoose");
const UserSettings = require('../models/userSettings');
const ccxt = require('ccxt');

async function findUserSettings(userID) {
    return UserSettings.findOne({ 'user.id': userID }).exec();
}

async function findUserCurrency(userSettingsObject) {
    return userSettingsObject?.settings?.currency || 'USD';
}

exports.Create = async function (req, res) {
    const { currency, autocapture, interval } = req.body;
    const userID = req.user._id;

    let userSettings = await findUserSettings(userID);

    if (!userSettings) {
        userSettings = new UserSettings({
            user: { id: userID },
            settings: { currency, autocapture, interval }
        });
    } else {
        userSettings.settings = { currency, autocapture, interval };
    }

    await userSettings.save();
    req.flash('info', 'Updated settings');
    res.redirect('/settings');
};

exports.Find = async function (req, res) {
    const userID = req.user._id;
    const userSettings = await findUserSettings(userID);
    const userCurrency = await findUserCurrency(userSettings);
    const userAutoCapture = userSettings?.settings?.autocapture || 'No';
    const userInterval = userSettings?.settings?.interval || '30 mins';

    const currencyArray = [
        { "code": "AUD", "symbol": "$" },
        { "code": "BRL", "symbol": "R$" },
        { "code": "CAD", "symbol": "$" },
        { "code": "CHF", "symbol": "Fr." },
        { "code": "CLP", "symbol": "$" },
        { "code": "CNY", "symbol": "RMB" },
        { "code": "CZK", "symbol": "Kč" },
        { "code": "DKK", "symbol": "kr." },
        { "code": "EUR", "symbol": "€" },
        { "code": "GBP", "symbol": "£" },
        { "code": "HKD", "symbol": "HK$" },
        { "code": "HUF", "symbol": "Ft" },
        { "code": "IDR", "symbol": "Rp" },
        { "code": "ILS", "symbol": "₪" },
        { "code": "INR", "symbol": "₹" },
        { "code": "JPY", "symbol": "¥" },
        { "code": "KRW", "symbol": "₩" },
        { "code": "MXN", "symbol": "$" },
        { "code": "MYR", "symbol": "RM" },
        { "code": "NOK", "symbol": "kr" },
        { "code": "NZD", "symbol": "$" },
        { "code": "USD", "symbol": "$" },
        { "code": "PHP", "symbol": "₱" },
        { "code": "PKR", "symbol": "₨" },
        { "code": "PLN", "symbol": "zł" },
        { "code": "RUB", "symbol": "₽" },
        { "code": "SEK", "symbol": "kr" },
        { "code": "SGD", "symbol": "S$" },
        { "code": "THB", "symbol": "฿" },
        { "code": "TRY", "symbol": "₺" },
        { "code": "TWD", "symbol": "NT$" },
        { "code": "ZAR", "symbol": "R" }
    ];

    res.render('settings.ejs', {
        user: req.user,
        exchangesArray: ccxt.exchanges,
        currencyArray,
        userCurrency,
        userAutoCapture,
        userInterval,
        message: req.flash('info')
    });
};