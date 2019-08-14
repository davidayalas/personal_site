var webp = require('webp-converter');
var fs = require('fs');

fs.readFile('public/index.html', 'utf8', function read(err, data) {
    if (err) {
        throw err;
    }

    data = data.slice(data.indexOf("headerImage")+15);
    data = data.slice(0,data.indexOf("';")).replace(/\\/g,"");
    webp.cwebp("public/"+data,"public/"+data+".webp","-q 80",function(status,error){
      	console.log(status,error);	
    });
});