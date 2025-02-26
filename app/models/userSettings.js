const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    user: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    settings: {
        currency: {
            type: String,
            required: true
        },
        autocapture: {
            type: String,
            required: true
        },
        interval: {
            type: String,
            required: true
        }
    }
});

module.exports = mongoose.model('UserSettings', userSettingsSchema);