const mongoose = require('mongoose');

const userKeySchema = new mongoose.Schema({
    user: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    details: {
        exchange: {
            type: String,
            required: true
        },
        key: {
            type: String,
            required: true
        },
        secret: {
            type: String,
            required: true
        },
        added: {
            type: Date,
            default: Date.now
        }
    }
});

module.exports = mongoose.model('UserKey', userKeySchema);