const utils = require('./utils-2');
require('dotenv').config();

async function main(){
    console.log(await utils.git().repo.push("test/prova.md", "hello"));
}

main();
