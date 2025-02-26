const mongoose = require('mongoose');

const userCoinSchema = new mongoose.Schema({
    user: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    coins: [
        {
            exchange: {
                type: String,
                required: true
            },
            coinsymbol: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            dateadded: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ]
});

module.exports = mongoose.model('UserCoin', userCoinSchema);