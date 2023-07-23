const utils = require('./libs/utils');

exports.handler = async function(event, context) {

    const response = await utils.request({
        "host" : 'www.davidayala.me',
        'method': "GET",
        "path" : `/.netlify/functions/twitter`
    });     

    return response;
};