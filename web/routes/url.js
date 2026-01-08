const express = require('express');

const main = require('../../main');
const utils = require('../../utils');
const flow = require('../../flow');

const User = require('../../schemas/user');
const Page = require('../../schemas/page');
const Log = require('../../schemas/log');

const app = express.Router();

app.get('/*/info', async (req, res) => {
    if(!req.isAuthenticated()) return res.redirect(`/login?redirect_url=${encodeURIComponent(req.originalUrl)}`);

    const user = await User.findOne({
        id: req.user.id
    });
    if(!main.getOwnerID().includes(req.user.id) && !user.allowedDomains.includes(req.hostname)) return res.status(403).end();

    let url = req.path.slice(1).split('/').slice(0, -1).join('/');
    if(url === '@root') url = '/';

    let page;

    const wildcardPage = utils.findWildcardPage(req.hostname, url);

    if(wildcardPage) page = wildcardPage.page;
    else page = await Page.findOne({
        domain: req.hostname,
        url
    }).lean();
    if(!page) return res.status(404).end();

    const pageLogs = await Log.find({
        urlId: page.id
    });
    page.usedCount = pageLogs.length;

    res.end(JSON.stringify(page, null, 2));
});

app.get('/*', async (req, res) => {
    const url = req.path.slice(1) || '/';

    const vars = {
        headers: req.headers,
        query: req.query
    };

    let page;

    const wildcardPage = utils.findWildcardPage(req.hostname, url);

    if(wildcardPage) {
        page = wildcardPage.page;
        for(let key in wildcardPage.vars) vars[key] = wildcardPage.vars[key];
    }
    else page = await Page.findOne({
        domain: req.hostname,
        url
    });

    if(!page) return res.status(404).end();

    if(req.user) vars.user = req.user;

    Log.create({
        url: page.url,
        urlId: page.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        locale: req.get('Accept-Language'),
        user: req.user?.id
    }).then();

    let loopCount = 0;
    for(let i = 0; i < page.flows.length; i++) {
        if(res.headersSent) return;
        if(++loopCount > 500) return res.status(508).end();

        const f = page.flows[i];

        const condition = flow.getCondition(f.condition.id);
        const action = flow.getAction(f.action.id);

        const conditionResult = await condition.conditionCheck(f.condition.data, req, res);
        if(!conditionResult) continue;

        if(action.id === 'JUMP') {
            const targetIndex = f.action.data.index - 1;
            if(targetIndex < 0 || targetIndex >= page.flows.length) return res.status(406).end();
            i = targetIndex - 1;
            continue;
        }

        await action.action(f.action.data, vars, req, res);
    }

    res.status(406).end();
});

module.exports = app;
