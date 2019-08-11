const Crittr = require('crittr');
const url = process.argv[2]
const dest = process.argv[3]

if(!url || !dest){
    console.log("url or destination css is empty");
    return;
}

Crittr({
    urls: [url],
    css:  "static/assets/css/style.css"
}).then(({critical, rest}) => {
    require('fs').writeFile(dest, critical, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("saved!");
    }); 
});