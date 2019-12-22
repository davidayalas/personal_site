const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const twitter = require('twitter');

const consumer_secret = process.env.SECRET || '';

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

  let hmac = crypto.createHmac('sha256', consumer_secret).update(crc_token).digest('base64')

  return {
    statusCode: 200,
    headers: {"content-type": "application/json"},
    body: JSON.stringify({response_token:"sha256="+hmac})
  }  
}

/**
 * Twitter webhook post
*/

function getSignature(body){
  var generatedSignature = 'sha256='.concat(
    crypto.createHmac('sha256', consumer_secret)
    .update(body,'utf8')
    //.update(JSON.stringify(body),'utf8')
    .digest('base64')
  );
  
  return generatedSignature;
}

async function post(event){
  //event.headers["x-twitter-webhooks-signature"]
  console.log(event.headers["x-twitter-webhooks-signature"] + "   <<>>   " + getSignature(event.body))
  if(event && event.body && validateSignature(event.body)) {
    let tData = JSON.parse(event.body)
    if ((tData.tweet_create_events && tData.tweet_create_events.length>0) || (tData.tweet_delete_events && tData.tweet_delete_events.length>0)){ //new or deleted tweet, post to Google Apps Script

    }
  }
}

async function getTweets(){
  var twitterClient = new twitter({
    consumer_key: '1XSrH2zEpUGgDCiBzVRr2g',
    consumer_secret: '1EuzWGgFeJxgs5muS6SGtlkpRSdTCGgOuxSnyi3pM',
    access_token_key: '263355563-OFQ7zIjVEOQ5MErcxpok5WjPGbxNZhbl7OOH8Zp9',
    access_token_secret: 'XJkVKPdtAtRnInMEefw6eJByzGVWqP8KyIs61xsDbz6hL'
  });

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

exports.handler = async event => {
    const tweets = await getTweets();
    if(event.httpMethod==="GET"){
      return get(event);
    }else if(event.httpMethod==="POST"){
      return await post(event);
    }
}
 