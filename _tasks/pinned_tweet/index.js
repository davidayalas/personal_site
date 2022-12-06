const fs = require('fs');
require('dotenv').config();

let bearer;

let options = {
    'hostname': "api.twitter.com",
    'port': 443,
    'method': "GET",
    'headers': {}
};

async function getTweet(_id, options){
    options.path = `${options.path}&id=${_id}`;
    let response = await request(options);
    if(response && response.body){
      response = JSON.parse(response.body);
    }
    return response;
}  

async function getTwitterBearerToken(){
    let oauth2 = new (require('oauth').OAuth2)(process.env.TWITTER_CONSUMER_KEY,process.env.TWITTER_CONSUMER_SECRET, 'https://api.twitter.com/', null, 'oauth2/token', null);
    return new Promise(function(resolve, reject) {
        oauth2.getOAuthAccessToken('', {'grant_type':'client_credentials'}, function (e, access_token, refresh_token, results){
            resolve(access_token);
        });
    });
}

async function request(options, data){
    return new Promise(function(resolve, reject) {
        let _response = {
            statusCode: 200, body : ""
        };
        const req = require("https").request(options, (res) => {
            res.on('data', (d) => _response.body += d.toString());
            res.on('end', () => resolve(_response));
        });
        req.on('error', (error) => {
            _response.statusCode = 500;
            _response.body = error;
            reject(_response);
        });
        req.write(data || '');
        req.end();   
    });      
}

async function main(){
    bearer = await getTwitterBearerToken();
    options.headers["Authorization"] = "Bearer " + bearer;
    options.path = `/2/users/by/username/${process.env.TWITTER_USER}?user.fields=created_at,description,pinned_tweet_id`;
    let userResponse = await request(options);
    userResponse = JSON.parse(userResponse.body);
    
    if(userResponse.data.pinned_tweet_id){
        options.path = "/1.1/statuses/show.json?tweet_mode=extended";
        const tweet = await getTweet(userResponse.data.pinned_tweet_id, options);
        let RT = "";
        const aux = tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media.length>0 ? tweet.extended_entities.media[0].media_url_https : "";
        if(tweet.full_text.indexOf("RT")===0){
          RT = tweet.full_text.slice(0,tweet.full_text.indexOf(":")+1);
        }
        let description = (tweet.retweeted_status && tweet.retweeted_status.full_text) ? RT + " " + tweet.retweeted_status.full_text : tweet.full_text;
        description = description.replace(/\n/g,"\n  ");
        if(!fs.existsSync(process.env.WRITE_PATH)){
            fs.mkdirSync(process.env.WRITE_PATH);
        }
        fs.writeFileSync(process.env.WRITE_PATH+"/pinned.md", `---\ntitle: \ndescription: >-\n ${description}\ndate: ${new Date(tweet.created_at).toISOString()}\nid: ${tweet.id_str}\nmedia: ${(RT==="" && aux) ? aux : ""}\n---`,"utf8");
    }
}

main();
