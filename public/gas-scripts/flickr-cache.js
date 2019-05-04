function refreshData(){
  var c = UrlFetchApp.fetch("http://api.flickr.com/services/rest/?format=json&method=flickr.photosets.getPhotos&photoset_id=72157631827789978&api_key=705379a7679d2edebe947274dacc997b").getContentText();
  c = c.slice(c.indexOf("{"),c.length-1);
  if(c.length>0 && c.indexOf("photoset")>-1){
    gscache.put("flickralbum", c);
  }
} 

function doGet(e){
  var c = gscache.get("flickralbum");
 
  var cb = "";
  if(e && e.parameters && e.parameters.callback){
    cb = e.parameters.callback + "(";
  }  

  return ContentService.createTextOutput((cb?cb:"")+JSON.stringify(c)+(cb?")":"")).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
