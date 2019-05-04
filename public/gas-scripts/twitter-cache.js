var CONSUMER_KEY = '....';
var CONSUMER_SECRET = '....';

function refreshData(){
  var twitterApp = "Twitter";
  
  var service = getService();
  if (service.hasAccess()) {
    var options = {
      "oAuthServiceName" : twitterApp,
      "oAuthUseToken" : "always"
    };
    var url = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=davidayalas&count=100&include_rts=1&include_entities=0&exclude_replies=1&contributor_details=0";
    var response = service.fetch(url);
    var c = response.getContentText();
    if(c.length>0 && c.indexOf("created_at")>-1){
      c = JSON.parse(c);
      var tweets = [];
      for(var i=0,z=c.length;i<z;i++){
        tweets.push({"created_at":c[i].created_at,"text":c[i].text});
      }
      gscache.put("twitterprofile", tweets);
    }
  } else {
    var authorizationUrl = service.authorize();
    Logger.log('Open the following URL and re-run the script: %s',authorizationUrl);
  }
} 

/**
 * Reset the authorization state, so that it can be re-tested.
 */
function reset() {
  var service = getService();
  service.reset();
}

/**
 * Configures the service.
 */
function getService() {
  return OAuth1.createService('Twitter')
      // Set the endpoint URLs.
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')

      // Set the consumer key and secret.
      .setConsumerKey(CONSUMER_KEY)
      .setConsumerSecret(CONSUMER_SECRET)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Handles the OAuth callback.
 */
function authCallback(request) {
  var service = getService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied');
  }
}

function doGet(e){
  var c = gscache.get("twitterprofile");
  var cb = "";
  if(e && e.parameters && e.parameters.callback){
    cb = e.parameters.callback + "(";
  }
  Logger.log(JSON.stringify(c))
  return ContentService.createTextOutput((cb?cb:"")+JSON.stringify(c)+(cb?")":"")).setMimeType(ContentService.MimeType.JAVASCRIPT);
}