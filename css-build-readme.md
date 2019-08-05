# How to uncss and get critical path

## Two steps to perform in local

1. uncss all css into styles.css (uncss.js)
2. start local hugo server and test styles.css against localhost:1313 (critical.js)

        $   sudo node uncss.js > static/assets/css/styles.css    
        $   hugo server &
        $   node critical.js http://localhost:1313 layouts/partials/critical-css-home.html

3. I made this in development stage, when I write templates for critical css and then, push to git with all the necessary.

Sample script [here](buildcss.sh)

## Requirements

        $   npm i uncss crittr    
