const utils2 = require('./utils-2');
const utils = require('./utils');
require('dotenv').config();

async function main(){
    const git_options = {
        git_type : process.env.GIT_TYPE && process.env.GIT_TYPE.toUpperCase()==="GITHUB" ? "GITHUB" : "GITLAB",
        project : process.env.GIT_PROJECTID,
        token : process.env.GIT_TOKEN, 
        owner : process.env.GIT_OWNER || "me@test.com"
    }
  
    const git = new utils2.git(git_options);

    //console.log(git.get());
    if(!git.repo){
        return
    }
    //console.log(await git.get());
    let content = await git.repo.get("test/prova.md");
    try{
        console.log((Buffer.from(JSON.parse(content.body).content, 'base64')).toString());
    }catch(e){}
    console.log(await git.repo.put("test/prova.md","hola holaaa"));
    //console.log(await git.repo.del("test/prova.md"));
    /*
    console.log(await git.repo.get("test/prova.md","hola"));*/
    //console.log(await git.repo.get("content/posts/the-witcher.md"));
    //console.log(await utils.git("get","content/posts/the-witcher.md"));
    //console.log(await git.repo.get("content/home.md"));
}

main();
