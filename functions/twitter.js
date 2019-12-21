const crypto = require('crypto');
const https = require('https')
const consumer_secret = process.env.SECRET || '';
const gas_endpoint_host = process.env.GAS_TWITTER_ENDPOINT_HOST || '';
const gas_endpoint_path = process.env.GAS_TWITTER_ENDPOINT_PATH || '';
const gas_api_key = process.env.GAS_API_KEY || '';

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

async function post(event){

  if (event.body) {
    let tData = JSON.parse(event.body)
    if ((tData.tweet_create_events && tData.tweet_create_events.length>0) || (tData.tweet_delete_events && tData.tweet_delete_events.length>0)){ //new or deleted tweet, post to Google Apps Script
      const data = JSON.stringify({
        api_key: gas_api_key
      })
      
      const options = {
        hostname: gas_endpoint_host,
        port: 443,
        path: gas_endpoint_path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }

      return new Promise((resolve, reject) => {

        const req = https.request(options, res => {
          res.on('data', (d) => {
            console.log(d.toString());
          });
          res.on('end', () => {
            resolve({
              statusCode: 200,
              headers: {"content-type": "application/json"},
              body: JSON.stringify({message:"done"})
            })
          });
        })
        
        req.on('error', error => {
          reject(error);
        })      

        req.write(data)
        req.end()
      });
    }
  }
}

exports.handler = async event => {
    if(event.httpMethod==="GET"){
      return get(event);
    }else if(event.httpMethod==="POST"){
      return await post(event);
    }
}
