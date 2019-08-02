var CLIENT_ID = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';
var CLIENT_SECRET = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var SS = "id spreadsheet to hold the tweets";

var Properties = PropertiesService.getScriptProperties();

/**
 * Authorizes and makes a request to the Twitter API.
 */
function run() {
  var service = getService();

  if (service.hasAccess()) {

    var url = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=davidayalas&count=110&include_rts=1&include_entities=0&exclude_replies=1&contributor_details=0&tweet_mode=extended";
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());

    var lastTweet = Properties.getProperty("lastTweet");
    
    //If not modified, returns
    if(result.length && result[0].id_str){
      if(lastTweet === result[0].id_str){
        Logger.log("not modified");
        return;
      }
    }

    //Else, fills new sheet, deletes latest and sets lastTweet
    var sheet = SpreadsheetApp.openById(SS);
    var sheetName = sheet.insertSheet().getName();
    var activeSheet = sheet.getActiveSheet();

    for(var i=0, z=result.length; i<z;i++){
      activeSheet.getRange(i+1, 1, 1,3).setValues([[[ (result[i].retweeted_status && result[i].retweeted_status.full_text ? result[i].retweeted_status.full_text : result[i].full_text) ],[result[i].created_at],[result[i].id_str]]])
    }

    for(var i=0; i<=sheet.getSheets().length; i++){
      if(sheet.getSheets()[i] && sheet.getSheets()[i].getName()!==sheetName){
        sheet.deleteSheet(sheet.getSheets()[i]);
      }
    }
    
    sheet.getSheets()[0].setName("Sheet1");
    Properties.setProperty("lastTweet",result[0].id_str);

  } else {
    Logger.log(service.getLastError());
  }
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
