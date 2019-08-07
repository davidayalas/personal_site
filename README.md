# About this site

This is my personal site and in it, I try some things about web publishing, standards and performance.

* It's a web published with a Static Site Generator (#SSG), [HUGO](https://gohugo.io), and edited throught a #Headless CMS, [NetlifyCMS](https://www.netlifycms.org).

* It's published in a CDN, in this case in [Netlify](http://netlify.com), but it can be published wherever.

* It gets some dynamic content from a Google Spreadsheet that has my recent tweets, that are populated with a [Google Apps Script](static/gas-scripts/get-twitter.gs)

* The template I use is from html5up.net: https://html5up.net/helios

* To make it performant, I try to acomplish with Google LightHouse. [This is my current report](https://lighthouse-dot-webdotdevsite.appspot.com/lh/html?url=https://www.davidayala.eu). This is the most complex thing: SSG, critical path CSS, inline it, uncss...  

## High level architecture diagram

![architecture](content/media/personal-site.png)



## How to uncss and get critical path

### Two steps to perform in local

1. UNCSS all css into styles.css [uncss.js](_tasks/css/uncss.js)
2. Get CRITICAL path CSS: [critical.js](_tasks/css/critical.js)
3. To do that, we need to generate static web, get uncss-styles, try them with running local web to get critical... 

                $ hugo
                $ node _tasks/css/uncss.js > static/assets/css/styles.css    
                $ hugo server &
                $ node _tasks/css/critical.js http://localhost:1313 $(pwd)/layouts/partials/critical-css-home.html
                $ node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/layouts/partials/critical-css-gallery.html
                $ kill $(ps aux | grep '[h]ugo' | awk '{print $2}')
                $ rm -R public

3. I made this in development stage, when I write templates for critical css and then, push to git with all the necessary.

Sample script [here](buildcss.sh)

## Requirements

        $   npm i uncss crittr    