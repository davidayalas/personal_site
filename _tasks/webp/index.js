var webp = require('webp-converter');
var fs = require('fs');
var _folder = "public/media/"; 

fs.readdir(_folder, (err, files) => {
  files.forEach(file => {
    webp.cwebp(_folder+file,_folder+file+".webp","-q 100",function(status,error){
        console.log(status,error);	
      });
    });
});