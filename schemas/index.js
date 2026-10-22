const mongoose = require('mongoose');
const fs = require('fs');

const setting = require('../setting.json');

const Page = require('./page');

module.exports = () => {
    const connect = async () => {
        try {
            await mongoose.connect(setting.MONGODB_URL || `mongodb://${setting.MONGODB_USER}:${setting.MONGODB_PASSWORD}@${setting.MONGODB_HOST}:${setting.MONGODB_PORT}/admin`, {
                dbName: setting.DBNAME
            });

            console.log('MongoDB connected.');

            const pages = await Page.find({
                url: {
                    $regex: /:/
                }
            }).lean();

            for(let page of pages) {
                global.wildcardPages[page.id] = page;
            }
        } catch(e) {
            console.error(e);
        }
    }
    connect().then();
    mongoose.connection.on('error', e => {
        console.error(e);
    });
    mongoose.connection.on('disconnected', () => {
        console.error('MongoDB disconnected. reconnecting...');
        // connect().then();
    });

    console.log('Loading schemas...');
    fs.readdirSync('./schemas').forEach(file => {
        if(file !== 'index.js') {
            require(`./${file}`);
            // console.log(`${file.trim()} schema loaded.`);
        }
    });
    console.log('All schemas loaded.');
}