const crypto = require('crypto')
const consumer_secret = process.env.SECRET || '';
exports.handler = async event => {

    if(event.httpMethod==="GET"){
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
    }else if(event.httpMethod==="POST"){

    }
  }