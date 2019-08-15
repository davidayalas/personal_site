hugo --config config-uncss.toml

node _tasks/css/uncss.js > static/assets/css/style.css    

hugo server &

#node _tasks/css/critical.js http://localhost:1313 $(pwd)/layouts/partials/critical-css-home.html
#node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/layouts/partials/critical-css-gallery.html
node _tasks/css/critical.js http://localhost:1313 $(pwd)/static/assets/css/critical-css-home.css
node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/static/assets/css/critical-css-gallery.css

css-purge -i $(pwd)/static/assets/css/critical-css-home.css -o $(pwd)/static/assets/css/critical-css-home.css 
css-purge -i $(pwd)/static/assets/css/critical-css-gallery.css -o $(pwd)/static/assets/css/critical-css-gallery.css
echo "body{font-family:helvetica,'Source Sans Pro',sans-serif;font-size:15pt;line-height:1.85em;}h2{font-size:2.85em}" >> $(pwd)/static/assets/css/critical-css-home.css 
echo "body{font-family:helvetica,'Source Sans Pro',sans-serif;font-size:15pt;line-height:1.85em;}h2{font-size:2.85em}" >> $(pwd)/static/assets/css/critical-css-gallery.css 

kill $(ps aux | grep '[h]ugo' | awk '{print $2}')
rm -R public