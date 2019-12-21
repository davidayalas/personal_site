var CLIENT_ID = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';
var CLIENT_SECRET = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var SS = "id spreadsheet to hold the tweets";

var Properties = PropertiesService.getScriptProperties();

function _request(url, token){
  var response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token
    },
    muteHttpExceptions: true
  });
  return JSON.parse(response.getContentText());
}

/**
 * Authorizes and makes a request to the Twitter API.
 */
function run() {
  var service = getService();

  if(!service.hasAccess()){
      Logger.log(service.getLastError());
      return;
  }

  var url = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=davidayalas&count=50&include_rts=1&include_entities=0&exclude_replies=1&contributor_details=0&tweet_mode=extended";
  var user_url = "https://api.twitter.com/labs/1/users?usernames=davidayalas&format=detailed";
  var pinned_url = "https://api.twitter.com/labs/1/tweets?ids={id}&format=detailed";
  
  var tweets = _request(url, service.getAccessToken());

  var user = _request(user_url, service.getAccessToken());

  var pinned_tweet = (user && user.data && user.data.length>0 ? user.data[0].pinned_tweet_id : null);
  pinned_tweet = _request(pinned_url.replace("{id}",pinned_tweet), service.getAccessToken());
  pinned_tweet = (pinned_tweet && pinned_tweet.data && pinned_tweet.data.length>0 ? [[[pinned_tweet.data[0].text],[pinned_tweet.data[0].created_at],[pinned_tweet.data[0].id], ["pinned"]]] : null);

  var lastTweet = Properties.getProperty("lastTweet");
  var lastPinnedTweet = Properties.getProperty("pinnedTweet");
  var lastPinnedTweetMedia = Properties.getProperty("pinnedTweetMedia");
  
  //If not modified, returns
  if(tweets.length && tweets[0].id_str){
    if(lastTweet === tweets[0].id_str && lastPinnedTweet===(pinned_tweet?pinned_tweet[0][2][0]:"")){
      Logger.log("not modified");
      return;
    }
  }
  
  //Else, fills new sheet, deletes latest and sets lastTweet
  var sheet = SpreadsheetApp.openById(SS);
  var sheetName = sheet.insertSheet().getName();
  var activeSheet = sheet.getActiveSheet();
  var RT = "";
  var row=1;
  var aux = "";
  
  if(pinned_tweet){
     activeSheet.getRange(row,1,1,4).setValues(pinned_tweet);
     row++;
  }
  
  for(var i=0,z=tweets.length; i<z;i++,row++){
    RT = ""; 
    aux = tweets[i] && tweets[i].extended_entities && tweets[i].extended_entities.media && tweets[i].extended_entities.media.length>0 ? tweets[i].extended_entities.media[0].media_url_https : "";
    if(pinned_tweet && pinned_tweet[0][2][0]===tweets[i].id_str){
      row--;
      if(lastPinnedTweetMedia!==aux){
        lastPinnedTweetMedia = aux;
      }
      if(lastPinnedTweetMedia){
          activeSheet.getRange('E1').setValue(lastPinnedTweetMedia);
      }
      continue;
    }
    if(tweets[i].full_text.indexOf("RT")===0){
      RT = tweets[i].full_text.slice(0,tweets[i].full_text.indexOf(":")+1);
    }
    activeSheet.getRange(row,1,1,5).setValues([[[ (tweets[i].retweeted_status && tweets[i].retweeted_status.full_text ? RT + " " + tweets[i].retweeted_status.full_text : tweets[i].full_text) ],[tweets[i].created_at],[tweets[i].id_str],[],[RT==="" && aux ? aux : ""]]])
  }
  
  for(var i=0; i<=sheet.getSheets().length; i++){
    if(sheet.getSheets()[i] && sheet.getSheets()[i].getName()!==sheetName){
      sheet.deleteSheet(sheet.getSheets()[i]);
    }
  }
  
  sheet.getSheets()[0].setName("Sheet1");
  Properties.setProperty("lastTweet",tweets[0].id_str);
  Properties.setProperty("pinnedTweet",pinned_tweet && pinned_tweet[0][2][0] ? pinned_tweet[0][2][0] : "");
  Properties.setProperty("pinnedTweetMedia", lastPinnedTweetMedia);
  
  //call netlify build
  UrlFetchApp.fetch(Properties.getProperty("build_hook"), {'method' : 'post'});
}

/**
 * Reset the authorization state, so that it can be re-tested.
 */
function reset() {
  getService().reset();
}

/**
 * Configures the service.
 */
function getService() {
  return OAuth2.createService('Twitter')
      // Set the endpoint URLs.
      .setTokenUrl('https://api.twitter.com/oauth2/token')

      // Set the client ID and secret.
      .setClientId(CLIENT_ID)
      .setClientSecret(CLIENT_SECRET)

      // Sets the custom grant type to use.
      .setGrantType('client_credentials')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Wrapper around run function to delete triggers
 */
function runWebhook(){
  run();
}

/**
 * Exposes endpoint to trigger run function, from netlify-functions twitter webhook
 */
function doPost(e){
  deleteTriggers();
  ScriptApp.newTrigger("runWebhook").timeBased().after(30*1000).create();
  ScriptApp.newTrigger("runWebhook").timeBased().after(70*1000).create();
  return ContentService.createTextOutput("done");
}

function deleteTriggers(){
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction()==="runWebhook"){
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
}
