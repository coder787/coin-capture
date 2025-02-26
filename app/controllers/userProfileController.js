const UserKey = require('../models/userKey');
const UserCoin = require('../models/userCoins');

async function fetchUserKeys(userID) {
    return UserKey.find({ 'user.id': userID }).exec();
}

async function fetchUserCoins(userID) {
    return UserCoin.findOne({ 'user.id': userID }).exec();
}

exports.Show = async function (req, res) {
    const userKeysArray = await fetchUserKeys(req.user._id);
    const userCoinsObject = await fetchUserCoins(req.user._id);
    const userCoinsArray = userCoinsObject ? userCoinsObject.coins : [];

    res.render('profile.ejs', {
        user: req.user,
        userKeysArray,
        userCoinsArray
    });
};