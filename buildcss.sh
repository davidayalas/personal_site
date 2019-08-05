node uncss.js > static/assets/css/styles.css    
hugo server &
node critical.js http://localhost:1313 layouts/partials/critical-css-home.html
node critical.js http://localhost:1313/gallery/ layouts/partials/critical-css-gallery.html
kill $(ps aux | grep '[h]ugo' | awk '{print $2}')