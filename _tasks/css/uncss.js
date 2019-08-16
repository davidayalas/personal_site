var uncss = require('uncss');

var files   = [__dirname+'/../../public/index.html', __dirname+'/../../public/gallery/index.html',__dirname+'/../../public/gallery/london-2014/index.html'],
    options = {
        stylesheets  : ['assets/css/main.css','assets/css/fontello.css'/*,'assets/css/font-awesome.min.css'*/],
        ignore       : [".hidden",".tweet"/*,".fa-plus-circle"*/,".pull-right","ul.default"],
    };

uncss(files, options, function (error, output) {
    console.log(output
            .replace(/\n/g, '')
            .replace(/'\.\.\/fonts/g, '\'/assets/fonts')
            .replace(/\/\*(.*?)\*\//g,"")
            .replace(/\s\s+/g, ' ')
            .replace(/\t\t+/g, '')
    );
});