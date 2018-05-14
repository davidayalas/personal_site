function replaceURLWithHTMLLinks(text){
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp,"<a href='$1'>$1</a>"); 
}

function fillZeros(number,digits){
	return String('000000000000'+number).slice(digits*-1);
}

$(document).ready(function(){

	$(".doingnow ul").addClass("default");

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
});

$('body.homepage #header').css('background-image', 'url("'+ (headerImage||null)+'")');

/* google analytics basic setup */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-44278878-1', 'davidayala.eu');
ga('send', 'pageview');