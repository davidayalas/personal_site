hugo
node _tasks/css/uncss.js > static/assets/css/styles.css    
hugo server &
node _tasks/css/critical.js http://localhost:1313 $(pwd)/layouts/partials/critical-css-home.html
node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/layouts/partials/critical-css-gallery.html
kill $(ps aux | grep '[h]ugo' | awk '{print $2}')
rm -R public