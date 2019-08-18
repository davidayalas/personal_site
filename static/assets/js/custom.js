
//$('body.homepage #header').css('background-image', 'url("'+ (headerImage||null)+'")');
_$('body.homepage #header').addCss('background-image', 'url("'+ (headerImage||null)+'")');


function replaceURLWithHTMLLinks(text){
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp,"<a href='$1'>$1</a>"); 
}

function fillZeros(number,digits){
	return String('000000000000'+number).slice(digits*-1);
}

var createGsMatrix = function(results){
	var gs_matrix = [], gs_col, gs_row;

	var orders = {
	  setted : {},
	  get : function(l){
		if(!this.setted[l]){
		  var ncols = 26;
		  var col = 0;
		  for(var i=l.length;i>0;i--){
			col += ((l.charCodeAt(i-1)-65)+1)*(Math.pow(ncols,(l.length-i)));
		  }
		  this.setted[l] = col-1;
		}
		return this.setted[l];
	  },
	}

	//creates gs_matrix
	var gs_max_cols = 0;
	for(var i=0,z=results.feed.entry.length;i<z;i++){
	  gs_col = orders.get(results.feed.entry[i].title.$t.slice(0,1));
	  gs_max_cols = (gs_max_cols<=gs_col?gs_col:gs_max_cols);
	  gs_row = parseInt(results.feed.entry[i].title.$t.slice(1))-1;
	  if(!gs_matrix[gs_row]){
		gs_matrix[gs_row]=[];
	  }
	  gs_matrix[gs_row][gs_col]=results.feed.entry[i].content.$t;
	}

	//fill empty cells
	gs_matrix.map(function(r){
		for(var k=0;k<=gs_max_cols;k++){
			if(!r[k]){r[k]=""}
		}
	});
	return gs_matrix;
}

_$().ready(function(){

	_$(".doingnow ul").addClass("default");

	//TWEETS

	_$().request("https://spreadsheets.google.com/feeds/cells/1xRcpFi4tL-mKvM4pJUbnQAQ0z3z4AED9lBVqMZKHeZ0/default/public/basic?alt=json-in-script&callback=?", function(data){
		var tweets = createGsMatrix(data);
		var stb = [], tweet_date, tcss="";
		for(var i=0;i<tweets.length;i++){
			tweet_date = new Date(tweets[i][1]);
			stb.push('<li',tcss,'><article class="tweet">',replaceURLWithHTMLLinks(tweets[i][0]),'<span class="timestamp"> (',	fillZeros(tweet_date.getUTCHours(),2),":",fillZeros(tweet_date.getUTCMinutes(),2)," ",fillZeros(tweet_date.getUTCMonth()+1,2),"/",fillZeros((tweet_date.getUTCDate()),2),"/",fillZeros((tweet_date.getUTCFullYear()),2),')</span> <!--a href="https://twitter.com/davidayalas/status/',tweets[i][2],'" style="font-size: .8rem;"><i class="icon fa-link fa-xs"></i></a--></article></li>');
			if(i>=11){
				tcss = " class='hidden'"
			}
		}

		if(stb.length>0){
			_$("<a href='#' id='moretweets' title='show more tweets' class='icon-plus' onclick='return false;'><span class='label'>[+]</span></a>").appendTo("#twitter");
			_$(stb.join("")).appendTo("#twitter ul");
		}

		_$("#moretweets").on("click", function(){
			_$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible");
			//$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible").removeClass("visible");
			if(_$("#twitter ul li.hidden").size()===0){
				_$("#moretweets").remove();
			}
			return false;
		});
	})
});

/* google analytics basic setup */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-44278878-1', 'davidayala.eu');
ga('send', 'pageview');
