/**
 * This lambda function does some things:
 * 1. Twitter webhook validation: crc token (GET) and x-twitter-webhooks-signature (POST webhook)
 * 2. Puts new tweets or retweets into github repo as data file to generate a Hugo build
 * 3. Deletes from github deleted tweets or undone retweets in twitter
 */

const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

const tw_consumer_secret = process.env.TWITTER_CONSUMER_SECRET || '';
const tw_user = process.env.TWITTER_USER || 'davidayalas';

let twitterRequestOptions = {
  "host" : "api.twitter.com",
  'port': 443,
  'method': "GET",
  'headers': {},
  "labs" : "/labs/1",
  "show" : "/1.1/statuses/show.json",
  "timeline" : "/1.1/statuses/user_timeline.json"
}

/**
 * Git Management
 */
const project = process.env.GITHUB_PROJECTID;
const owner = process.env.GITHUB_OWNER || "";
const token =  "token " + process.env.GITHUB_TOKEN;
const auth_header = "Authorization";
 
async function git(action, content){
 
  let data = {
    "branch": "master", 
    "message": "twitter webhook"
  };
 
  let options = {
    'hostname': "api.github.com",
    'port': 443,
    'headers': {
      'Content-Type': 'application/json'
    }
  };

  switch(action){
    case "push":
      data.content = Buffer.from(JSON.stringify(content)).toString("base64");
      options.method = "PUT";
      break;
    case "del":
      data.sha = content.sha;
      options.method = "DELETE";
      break;
    default:
      options.method = "GET";
  }

  data = JSON.stringify(data);

  let file = `data/tweets/${content.id}.json`;

  options.headers[auth_header] = token;
  options.headers["user-agent"] = "twitter-webhook";
  options.path = `/repos/${owner}/${project}/contents/${file}`;
  options.headers["content-length"] = data.length;

  return await request(options, data);  
}

/**
 * Twitter challenge to verify hook
 */
function getTwitterCRC(event){
  const crc_token = event.queryStringParameters.crc_token || null;
  if(!crc_token){
    return {
      statusCode: 401,
      body: `Missing token parameter`,
    }      
  }

  let hmac = crypto.createHmac('sha256', tw_consumer_secret).update(crc_token).digest('base64')

  return {
    statusCode: 200,
    headers: {"content-type": "application/json"},
    body: JSON.stringify({response_token:"sha256="+hmac})
  }  
} 

/**
 * Twitter Signature Validation
 */
function getTwitterPostSignature(body){
  var generatedSignature = 'sha256='.concat(
    crypto.createHmac('sha256', tw_consumer_secret)
    .update(body,'utf8')
    .digest('base64')
  );
  
  return generatedSignature;
}

/**
 * Get tweet details
 */
async function getTweet(_id){
  let options = twitterRequestOptions;
  options.path = `${options.show}?id=${_id}&tweet_mode=extended`;
  let response = await request(options);
  if(response && response.body){
    response = JSON.parse(response.body);
  }
  return response;
}

/**
 * Twitter webhook post
 */
async function twitterWebHook(event){

  if(!event || !event.body || getTwitterPostSignature(event.body)!==event.headers["x-twitter-webhooks-signature"]){
    return {
      statusCode: 401,
      body: ""
    }  
  }

  let tData = JSON.parse(event.body)
  let tweet;

  //NEW TWEET
  if(tData.tweet_create_events && tData.tweet_create_events.length>0){
    if(tData.tweet_create_events && (tData.tweet_create_events[0].user.screen_name!==tw_user || tData.tweet_create_events[0].in_reply_to_user_id!==null)){ // if not tweet from user or is a response
      return {statusCode : 401, body : ""};
    }
    tweet = await getTweet(tData.tweet_create_events[0].id_str);
    let RT = "";
    let aux = tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media.length>0 ? tweet.extended_entities.media[0].media_url_https : "";
    if(tweet.full_text.indexOf("RT")===0){
      RT = tweet.full_text.slice(0,tweet.full_text.indexOf(":")+1);
    }
    let object = {
      "content" : (tweet.retweeted_status && tweet.retweeted_status.full_text) ? RT + " " + tweet.retweeted_status.full_text : tweet.full_text,
      "date" : +new Date(tweet.created_at),
      "id" : tweet.id_str,
      "media" : (RT==="" && aux) ? aux : ""
    }
    object.content = object.content.replace("\"","\\\"");
    await git("push", object);
  }

  //DELETE TWEET
  else if(tData.tweet_delete_events && tData.tweet_delete_events.length>0){
    let contents = await git("get",{id:tData.tweet_delete_events[0].status.id});
    contents = JSON.parse(contents.body);
    await git("del", {"id":tData.tweet_delete_events[0].status.id, "sha" : contents.sha});
  }

  //FAV TWEET --> test if is a fav on a own tweet to send a post to Netlify Webhook and build (this is because Pinned Tweets doesn't send webhook)
  else if(tData.favorite_events && tData.favorite_events.length>0){
    console.log(JSON.stringify(tData.favorite_events))
    tweet = tData.favorite_events[0];
    if(tweet.favorited_status.user.screen_name === tw_user && tweet.user.screen_name === tw_user){
      await request({
        "host" : "api.netlify.com",
        'method': "POST",
        "path" : `/build_hooks/${process.env.WEBHOOK_ID}`
      });
    }
  }

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
 * Lambda Handler
 */
exports.handler = async event => {
  if(event.httpMethod==="GET"){
    return getTwitterCRC(event);
  }else if(event.httpMethod==="POST"){
    twitterRequestOptions.headers["Authorization"] = "Bearer " + await twitterGetBearerToken();
    return await twitterWebHook(event);
  }
}