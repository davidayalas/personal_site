var cssPurge = require('css-purge');
const input = process.argv[2];
const output = process.argv[3];

console.log(__dirname+'/config_css.json')

cssPurge.purgeCSSFiles({
    css_output: output,
    css: input 
},
    __dirname+'/config_css.json'
);