hugo --config config-uncss.toml

node _tasks/css/uncss.js > static/assets/css/style.css    

#hugo server &

#node _tasks/css/critical.js http://localhost:1313 $(pwd)/static/assets/css/critical-css-home.css
#node _tasks/css/critical.js http://localhost:1313/gallery/  $(pwd)/static/assets/css/critical-css-gallery.css

#css-purge -i $(pwd)/static/assets/css/critical-css-home.css -o $(pwd)/static/assets/css/critical-css-home.css 
#css-purge -i $(pwd)/static/assets/css/critical-css-gallery.css -o $(pwd)/static/assets/css/critical-css-gallery.css

css-purge -i $(pwd)/static/assets/css/style.css -o $(pwd)/static/assets/css/style.css 

#kill $(ps aux | grep '[h]ugo' | awk '{print $2}')
rm -R public