const mongoose = require('mongoose');

const userCaptureSchema = new mongoose.Schema({
    user: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    details: {
        name: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        totaldollar: {
            type: Number,
            required: true
        },
        totalBTC: {
            type: Number,
            required: true
        },
        BTCPrice: {
            type: Number,
            required: true
        },
        portfolio: {
            type: Array,
            required: true
        },
        userCurrency: {
            type: String,
            required: true
        }
    }
});

module.exports = mongoose.model('UserCapture', userCaptureSchema);