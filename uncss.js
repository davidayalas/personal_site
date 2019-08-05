var uncss = require('uncss');

var files   = ['index.html', 'gallery/index.html','gallery/london-2014/index.html'],
    options = {
        banner       : false,
        stylesheets : ['assets/css/main.css','assets/css/font-awesome.min.css'],
        ignore      : [".hidden",".tweet",".fa-plus-circle"],
        output       : 'assets/css/styles.css'
    };

uncss(files, options, function (error, output) {
    console.log(error);
    console.log(output);
});