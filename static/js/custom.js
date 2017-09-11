function replaceURLWithHTMLLinks(text){
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp,"<a href='$1'>$1</a>"); 
}

function fillZeros(number,digits){
	return String('000000000000'+number).slice(digits*-1);
}

$(document).ready(function(){

	$(".doingnow ul").addClass("default");

	//FLICKR
	$.getJSON("https://script.google.com/macros/s/AKfycbwSsffQhkYAK2xjRu1Ck0TYdg2uDnnTG7eJsfLXPUSEM2XhAyPM/exec?callback=?", function(data){
		var stb = [];
		var it;
		var src;
		for(var i=0;i<data.photoset.photo.length;i++){
			it = data.photoset.photo[i];
			src = "http://farm"+it.farm+".static.flickr.com/"+it.server+"/"+it.id+"_"+it.secret;
			stb.push('<article><a href="',src,'_b.jpg" class="image featured"><img src="',src,'_n.jpg" alt="" /></a><!--header><h3><a href="#">',it.title,'</a></h3></header--><p>',it.title,'</p></article>');
		}
		if(stb.length>0){
			$(stb.join("")).appendTo($(".flickr .reel"));
		}
	});

	//TWEETS
	$.getJSON("https://script.google.com/macros/s/AKfycbzLmZM7BRV_l4X9WL1h2QiQZmBrMZo19B6Eztx7ioT6osF9NZHg/exec?callback=?", function(data){
		var stb = [], tweet_date, tcss="";

		for(var i=0;i<data.length;i++){
			tweet_date = new Date(data[i].created_at);
			stb.push('<li',tcss,'><article class="tweet">',replaceURLWithHTMLLinks(data[i].text),'<span class="timestamp"> (',	fillZeros(tweet_date.getUTCHours(),2),":",fillZeros(tweet_date.getUTCMinutes(),2)," ",fillZeros(tweet_date.getUTCMonth()+1,2),"/",fillZeros((tweet_date.getUTCDate()),2),"/",fillZeros((tweet_date.getUTCFullYear()),2),')</span></article></li>');
			if(i>=9){
				tcss = " class='hidden'"
			}
		}

		if(stb.length>0){
			$("<a href='#' id='moretweets' title='show more tweets' class='icon fa-plus-circle'><span class='label'>[+]</span></a>").appendTo($("#twitter"));
			$(stb.join("")).appendTo($("#twitter ul"));
		}

		$("#moretweets").on("click",function(){
			$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible").removeClass("visible");
			if($("#twitter ul li.hidden").size()===0){
				$("#moretweets").remove();
			}
			return false;
		});
	});

	//PROJECTS
	/*var projects = [
		{title : "markdown2json", link : "https://github.com/davidayalas/markdown2json", description : "easy markdown to json converter. Transform front matter properties and content into json key-values. Very easy to integrate with static sites generators. It creates an index that can be easily injected into algolia."},
		{title : "Bluemix client", link : "https://github.com/davidayalas/bluemix-client", description : "Node.js Bluemix API client. It wraps CloudFoudry API and Containers API over a common interface."},
		{title : "StaticDB", link : "https://github.com/davidayalas/staticdb", description : "generates hashed filenames with content from each row in a CSV that would we http-requested applying the same derive key algorithm. It provides the server process and the html client"},
		{title : "go-scraper", link : "https://github.com/davidayalas/go-scraper", description : "proof of concept of Golang.org that scrapes content from a web application launching multiple and concurrent requests."},
		{title : "gsa-jsonp-proxy", link : "https://github.com/davidayalas/gsa-jsonp-proxy", description : "a json proxy over google search protocol from <a href='https://support.google.com/gsa/'>Google Search Appliance</a>"},
		{title : "gs-cache", link : "https://github.com/davidayalas/gscache", description : "Google Apps Sache and <k>scriptdb</k> SpreadSheet wrapper for Google Apps Script with real persistence and value splitting for large values (due to Google Apps Scripts limits)."},
		{title : "gae-cache", link : "https://github.com/davidayalas/gae-cache", description : "cache and blobstore wrapper for Google App Engine (python) with real persistence and value splitting for large values (due to Google App Engine limits)."},
		{title : "More mini projects here", link : "https://github.com/davidayalas/", description : ""},
	];

	var projects_html = [];

	for(var i=0,z=projects.length;i<z;i++){
		projects_html.push('<li><article class="post stub"><header><h3><a href="',projects[i].link,'">',projects[i].title,'</a></h3></header><p>',projects[i].description,'</p></article></li>');
	}

	$(projects_html.join("")).appendTo($("#projects ul"));
	*/
});

$('#header').css('background-image', 'url("../../images/header.jpg")');

/* google analytics basic setup */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-44278878-1', 'davidayala.eu');
ga('send', 'pageview');