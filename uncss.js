var uncss = require('uncss');

var files   = ['public/index.html', 'public/gallery/index.html','public/gallery/london-2014/index.html'],
    options = {
        banner       : false,
        stylesheets  : ['assets/css/main.css','assets/css/font-awesome.min.css'],
        ignore       : [".hidden",".tweet",".fa-plus-circle","ul.default"],
        output       : 'assets/css/styles.css'
    };

uncss(files, options, function (error, output) {
    console.log(output.replace(/\n/g, '').replace(/\s\s+/g, ' '));
});