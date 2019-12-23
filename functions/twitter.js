/**
 * This lambda function does some things:
 * 1. Twitter webhook validation: crc token (GET) and x-twitter-webhooks-signature (POST webhook)
 * 2. Puts new tweets into github repo to generate a build
 * 3. Deletes from github deleted tweets in twitter
 */

const crypto = require('crypto');
const https = require('https');
const twitter = require('twitter');
require('dotenv').config();

const tw_consumer_key = process.env.TWITTER_CONSUMER_KEY || '';
const tw_consumer_secret = process.env.TWITTER_CONSUMER_SECRET || '';
const tw_access_token = process.env.TWITTER_ACCESS_TOKEN || '';
const tw_access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const tw_user = process.env.TWITTER_USER || 'davidayalas';

const twitterClient = new twitter({
  "consumer_key": tw_consumer_key,
  "consumer_secret": tw_consumer_secret,
  "access_token_key": tw_access_token,
  "access_token_secret": tw_access_token_secret
});

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
  };

  let options = {
    'hostname': "api.github.com",
    'port': 443,
    'headers': {
      'Content-Type': 'application/json'
    }
  };

  switch(action){
    case "new":
      data.content = Buffer.from(JSON.stringify(content)).toString("base64");
      data.message = "twitter webhook";
      options.method = "PUT";
      break;
    case "del":
      data.message = "twitter webhook";
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

    req.write(data);
    req.end();
    
  });  
}

/**
 * Twitter challenge to verify hook
 */
function get(event){
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
function getSignature(body){
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
  var params = {
    screen_name: 'davidayalas',
    id : _id,
    tweet_mode : "extended"
  };

  return new Promise((resolve, reject) => {
    twitterClient.get('statuses/show', params, function(error, tweet, response) {
      if (!error) {
        resolve(tweet);
      }
      reject(error);
    });  
  });
}

/**
 * Twitter webhook post
 */
async function post(event){
  if(event && event.body && getSignature(event.body)===event.headers["x-twitter-webhooks-signature"]) {
    let tData = JSON.parse(event.body)
    let tweet;

    //NEW TWEET
    if(tData.tweet_create_events && tData.tweet_create_events.length>0){
      if(tData.tweet_create_events[0].user.screen_name!==tw_user || tData.tweet_create_events[0].in_reply_to_user_id!==null){
        return null;
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
      await git("new", object);
    }

    //DELETE TWEET
    else if(tData.tweet_delete_events && tData.tweet_delete_events.length>0){
      let contents = await git("get",{id:tData.tweet_delete_events[0].status.id})
      contents = JSON.parse(contents.body)
      await git("del", {"id":tData.tweet_delete_events[0].status.id, "sha" : contents.sha});
    }

  }
}

exports.handler = async event => {
  console.log(await getTweet("1209136328891387904"))
  if(event.httpMethod==="GET"){
    return get(event);
  }else if(event.httpMethod==="POST"){
    return await post(event);
  }
}
 

/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * I used this function to generate files for historical tweets... not needed anymore
 */
async function getTweets(){
  //const fs = require('fs');

  var params = {
    screen_name: 'davidayalas',
    count : 200,
    include_rts : 1,
    include_entities : 0,
    exclude_replies : 1,
    contributor_details : 0,
    tweet_mode : "extended"
  };

  return new Promise((resolve, reject) => {

    let jsonTweets = {};
    let RT = "";
    twitterClient.get('statuses/user_timeline', params, function(error, tweets, response) {
      if (!error) {
        for(let i=0,z=tweets.length;i<z;i++){
          RT = "";
          aux = tweets[i] && tweets[i].extended_entities && tweets[i].extended_entities.media && tweets[i].extended_entities.media.length>0 ? tweets[i].extended_entities.media[0].media_url_https : "";
          if(tweets[i].full_text.indexOf("RT")===0){
            RT = tweets[i].full_text.slice(0,tweets[i].full_text.indexOf(":")+1);
          }
          jsonTweets[tweets[i].id_str] = {
            content : (tweets[i].retweeted_status && tweets[i].retweeted_status.full_text) ? RT + " " + tweets[i].retweeted_status.full_text : tweets[i].full_text,
            date : +new Date(tweets[i].created_at),
            id : tweets[i].id_str,
            media : (RT==="" && aux) ? aux : ""
          }
        }
        resolve(jsonTweets);
      }
      reject(error);
    });

  });
}