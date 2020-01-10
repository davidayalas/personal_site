const https = require('https');
const fs = require('fs');
require('dotenv').config();

const tw_user = process.env.TWITTER_USER || 'davidayalas';

let options = {
    "host" : "api.twitter.com",
    'port': 443,
    'method': "GET",
    'headers': {},
    "_path" : "/1.1/statuses/user_timeline.json"
}  

/**
 * Twitter bearer token
 */
async function twitterGetBearerToken(){
    let oauth2 = new (require('oauth').OAuth2)(process.env.TWITTER_CONSUMER_KEY,process.env.TWITTER_CONSUMER_SECRET, 'https://api.twitter.com/', null, 'oauth2/token', null);
    return new Promise(function(resolve, reject) {
        oauth2.getOAuthAccessToken('', {'grant_type':'client_credentials'}, function (e, access_token, refresh_token, results){
            resolve(access_token);
        });
    });
}
  
/**
 * Request generic function
 */
async function request(options, data){
    return new Promise(function(resolve, reject) {
        let _response = {
            statusCode: 200, body : ""
        };
        const req = https.request(options, (res) => {
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

/**
 * Generate files for historical tweets... not needed anymore
 */
async function getTweets(maxid, token){

  const params = {
    "screen_name" : tw_user,
    "count" : 1,
    "include_rts" : 1,
    "include_entities" : 0,
    "exclude_replies" : true,
    "contributor_details" : 0,
    "tweet_mode" : "extended",
    "include_rts" : 1,
    "trim_user" : true
  }

  options.headers["Authorization"] = "Bearer " + token;
  options.path = `${options._path}?${Object.entries(params).map(it=>it.join("=")).join("&")}${maxid ? "&max_id="+maxid : ""}`;
  let response = await request(options);
  let tweets = JSON.parse(response.body);
  let RT = "";
  let description = "";
  
  if(tweets[tweets.length-1].id_str===maxid){
      return [false, ""];
  }

  for(let i=0,z=tweets.length;i<z;i++){
    RT = "";
    aux = tweets[i] && tweets[i].extended_entities && tweets[i].extended_entities.media && tweets[i].extended_entities.media.length>0 ? tweets[i].extended_entities.media[0].media_url_https : "";
    if(tweets[i].full_text.indexOf("RT")===0){
      RT = tweets[i].full_text.slice(0,tweets[i].full_text.indexOf(":")+1);
    }
    description = (tweets[i].retweeted_status && tweets[i].retweeted_status.full_text) ? RT + " " + tweets[i].retweeted_status.full_text : tweets[i].full_text;
    description = description.replace(/\n/g,"\n  ");
    fs.writeFileSync(`content/tweets/${tweets[i].id_str}.md`, `---\ntitle: \ndescription: >-\n ${description}\ndate: ${new Date(tweets[i].created_at).toISOString()}\nid: ${tweets[i].id_str}\nmedia: ${(RT==="" && aux) ? aux : ""}\n---`, "utf8");
  }
  console.log("retrieved ", tweets.length, " tweets")
  return [true, tweets[tweets.length-1].id_str];
}

async function main(){
    let next = true, last=null;
    const token = await twitterGetBearerToken();
    do{
        [next, last] = await getTweets(last, token);
    }while(next);
}

main();
