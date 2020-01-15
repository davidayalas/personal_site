/**
 * This lambda function does some things:
 * 1. Twitter webhook validation: crc token (GET) and x-twitter-webhooks-signature (POST webhook)
 * 2. Puts new tweets or retweets into github repo as data file to generate a Hugo build
 * 3. Deletes from github deleted tweets or undone retweets in twitter
 */

const crypto = require('crypto');
const utils = require('./libs/utils');
require('dotenv').config();

const git_options = {
  git_type : process.env.GIT_TYPE && process.env.GIT_TYPE.toUpperCase()==="GITLAB" ? "GITLAB" : "GITHUB",
  project : process.env.GIT_PROJECTID,
  token : process.env.GIT_TOKEN, 
  owner : process.env.GIT_OWNER || "me@test.com"
}

let git = null;

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
  let response = await utils.request(options);
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
  let reBuild = false;
  let i,z;

  //NEW TWEET
  if(tData.tweet_create_events && tData.tweet_create_events.length>0){
    if(tData.tweet_create_events && (tData.tweet_create_events[0].user.screen_name!==tw_user || tData.tweet_create_events[0].in_reply_to_user_id!==null)){ // if not tweet from user or is a response
      return {statusCode : 401, body : ""};
    }
    let description = "";
    let RT = "";
    let aux = "";
    for(i=0,z=tData.tweet_create_events.length;i<z;i++){
      reBuild = true;
      tweet = await getTweet(tData.tweet_create_events[i].id_str);
      aux = tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media.length>0 ? tweet.extended_entities.media[0].media_url_https : "";
      RT = tweet.full_text.indexOf("RT")===0 ? tweet.full_text.slice(0,tweet.full_text.indexOf(":")+1) : "";
      description = (tweet.retweeted_status && tweet.retweeted_status.full_text) ? RT + " " + tweet.retweeted_status.full_text : tweet.full_text;
      description = description.replace(/\n/g,"\n  ");  
   
      await git.repo.put(`content/tweets/${tweet.id_str}.md`, `---\ntitle: \ndescription: >-\n ${description}\ndate: ${new Date(tweet.created_at).toISOString()}\nid: ${tweet.id_str}\nmedia: ${(RT==="" && aux) ? aux : ""}\n---`, {"message":"twitter webhook [skip ci]"});
    }
  }

  //DELETE TWEET
  if(tData.tweet_delete_events && tData.tweet_delete_events.length>0){
    let contents = "", file="";
    for(i=0,z=tData.tweet_delete_events.length;i<z;i++){
      reBuild = true;
      file = `content/tweets/${tData.tweet_delete_events[i].status.id}.md`;
      await git.repo.del(file, {"message":"twitter webhook [skip ci]"});
    }
  }

  //FAV TWEET --> test if is a fav on an own tweet to send a post to Netlify Webhook and build (this is because Pinned Tweets doesn't send webhook)
  if(tData.favorite_events && tData.favorite_events.length>0){
    for(i=0,z=tData.favorite_events.length;i<z;i++){
      tweet = tData.favorite_events[i];
      if(tweet.favorited_status.user.screen_name === tw_user && tweet.user.screen_name === tw_user){
        reBuild = true;
      }
    }
  }

  if(reBuild){
    await utils.request({
      "host" : "api.netlify.com",
      'method': "POST",
      "path" : `/build_hooks/${process.env.WEBHOOK_ID}`
    });    
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
 * Lambda Handler
 */
exports.handler = async event => {
  if(!git){
    git = new utils.git(git_options);
  }
    
  if(event.httpMethod==="GET"){
    return getTwitterCRC(event);
  }else if(event.httpMethod==="POST"){
    twitterRequestOptions.headers["Authorization"] = "Bearer " + await twitterGetBearerToken();
    return await twitterWebHook(event);
  }
}