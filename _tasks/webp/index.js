var webp = require('webp-converter');
var fs = require('fs');
var _folder = "public/media/"; 

/*fs
  .readdirSync(_folder)
  .filter(file => (file.slice(file.lastIndexOf("."))!==".html"))
  .forEach((file) => {
    webp.cwebp(_folder+file,_folder+file+".webp","-q 100",function(status,error){
      //console.log(status,error);	
    });
  }*/

fs.readdir(_folder, (err, files) => {
  files.forEach(file => {
    if(file.slice(file.lastIndexOf("."))===".html"){
        return;
    }
    webp.cwebp(_folder+file,_folder+file+".webp","-q 100",function(status,error){
        //console.log(status,error);	
      });
    });
});