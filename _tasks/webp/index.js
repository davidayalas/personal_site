const fs = require('fs');
const webp = require('webp-converter');
const _path = "_tasks/webp"
const _folder = __dirname.replace(_path,"") + "public/media/"; 

/*function execShellCommand(cmd) {
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
   exec(cmd, (error, stdout, stderr) => {
    if (error) {
     console.warn(error);
    }
    resolve(stdout? stdout : stderr);
   });
  });
 }

fs
  .readdirSync(_folder)
  .filter(file => (file.slice(file.lastIndexOf("."))!==".html" && file.slice(file.lastIndexOf("."))!==".webp"))
  .forEach(async (file) => {
    console.log(file+".webp");
    await execShellCommand(_path+'/bin/cwebp ' + _folder+file + " -o " + _folder+file + ".webp");
  })*/

fs.readdir(_folder, (err, files) => {
  files.forEach(file => {
    if(file.slice(file.lastIndexOf("."))===".html" || file.slice(file.lastIndexOf("."))===".webp"){
        return;
    }
    webp.cwebp(_folder+file,_folder+file+".webp","-q 100",function(status,error){
      //console.log(status,error);	
    });
  });
});