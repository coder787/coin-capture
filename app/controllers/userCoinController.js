const ccxt = require('ccxt');
const UserCoin = require('../models/userCoins');
const moment = require('moment');

async function findUserCoins(userID) {
    return UserCoin.findOne({ 'user.id': userID }).exec();
}

async function getCoinPrice(exchangeName, coinSymbol) {
    const exchange = new ccxt[exchangeName]();
    const { ask } = await exchange.fetchTicker(`${coinSymbol}/BTC`);
    return ask;
}

exports.Process = async function (req, res) {
    const { exchange, coinsymbol, quantity } = req.body;

    if (!exchange || !coinsymbol || !quantity) {
        const exchangesArray = ccxt.exchanges;
        const exchangeInstance = new ccxt[exchange]();
        const markets = await exchangeInstance.loadMarkets();
        const dupCoinarray = [...new Set(Object.values(markets).map(m => m.base))].sort();

        return res.render('manual.ejs', {
            user: req.user,
            selectedExchange: exchange,
            exchangesArray,
            dupCoinarray,
            message: req.flash('info')
        });
    }

    let userCoinsObject = await findUserCoins(req.user._id);
    const datenow = moment().format("ddd DD-MM-YY, HH:mm:ss");
    const coinPrice = await getCoinPrice(exchange, coinsymbol);

    if (!userCoinsObject) {
        userCoinsObject = new UserCoin({
            user: { id: req.user._id },
            coins: [{ exchange, coinsymbol, quantity, dateadded: datenow, price: coinPrice }]
        });
    } else {
        userCoinsObject.coins.push({ exchange, coinsymbol, quantity, dateadded: datenow, price: coinPrice });
    }

    await userCoinsObject.save();
    req.flash('info', 'Coin saved successfully');
    res.redirect('/manual');
};

exports.DeleteGet = async function (req, res) {
    if (!req.user) {
        return res.render('deletecoins.ejs', { user: null, message: req.flash('info') });
    }

    const userCoinsArray = await findUserCoins(req.user._id);
    res.render('deletecoins.ejs', {
        user: req.user,
        userCoinsArray: userCoinsArray ? userCoinsArray.coins : null,
        message: req.flash('info')
    });
};

exports.Delete = async function (req, res) {
    const { cointodelete } = req.body;
    const coinSymbol = cointodelete.substring(0, cointodelete.indexOf('(') - 1);

    await UserCoin.updateOne(
        { 'user.id': req.user._id },
        { $pull: { coins: { coinsymbol: coinSymbol } } }
    );

    req.flash('info', `Deleted coin ${coinSymbol} successfully`);
    res.redirect('/deletecoins');
};