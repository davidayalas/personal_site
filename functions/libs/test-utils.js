require('dotenv').config();
const utils = require("./utils");

async function main(){
    const file = "test/prova.md";

//    console.log(await utils.git("push", file, {"message":"twitter webhook [skip ci]"}, "LOREM", true));

    let contents = await utils.git("get", file);
    contents = JSON.parse(contents.body);
    console.log(await utils.git("del", file, {"message":"twitter webhook [skip ci]","sha":contents.sha}));
}

main()
