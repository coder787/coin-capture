const mongoose = require("mongoose");
const UserKey = require('../models/userKey');
const moment = require('moment');

exports.Create = async function (req, res) {
    const { exchange, key, secret } = req.body;
    const datenow = moment();

    const newUserKey = new UserKey({
        user: { id: req.user._id },
        details: { exchange, key, secret, added: datenow }
    });

    await newUserKey.save();
    req.flash('info', 'Keys saved successfully');
    res.redirect('/enter');
};

exports.Find = async function (req, res) {
    const userKeysArray = await UserKey.find({ 'user.id': req.user._id });
    res.render('profile.ejs', { user: req.user, userKeysArray });
};

exports.DeleteGet = async function (req, res) {
    if (!req.user) {
        return res.render('deletekeys.ejs', { user: null, message: req.flash('info') });
    }

    const userKeysArray = await UserKey.find({ 'user.id': req.user._id });
    res.render('deletekeys.ejs', { user: req.user, userKeysArray, message: req.flash('info') });
};

exports.Delete = async function (req, res) {
    const { keytodelete } = req.body;
    const apiKey = keytodelete.substring(keytodelete.indexOf('(') + 1, keytodelete.indexOf(')'));

    await UserKey.deleteOne({ 'details.key': apiKey });

    req.flash('info', `Key ${apiKey} deleted successfully`);
    res.redirect('/deletekeys');
};

exports.FindUserKeys = async function (userID) {
    return UserKey.find({ 'user.id': userID });
};