hugo --config config-uncss.toml

node _tasks/css/uncss.js > static/assets/css/style.css    

hugo server &

#node _tasks/css/critical.js http://localhost:1313 $(pwd)/layouts/partials/critical-css-home.html
#node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/layouts/partials/critical-css-gallery.html
node _tasks/css/critical.js http://localhost:1313 $(pwd)/static/assets/css/critical-css-home.css
node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/static/assets/css/critical-css-gallery.css

#node _tasks/css/css-purge.js $(pwd)/static/assets/css/critical-css-home.css  $(pwd)/static/assets/css/critical-css-home.css
#node _tasks/css/css-purge.js $(pwd)/static/assets/css/critical-css-gallery.css  $(pwd)/static/assets/css/critical-css-gallery.css

kill $(ps aux | grep '[h]ugo' | awk '{print $2}')
rm -R public