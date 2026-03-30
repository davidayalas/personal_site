_$().ready(function(){

	// Lazy-load all images
	const observer = window.lozad();
	observer.observe();

	// "More tweets" toggle
	_$("#moretweets").on("click", function(){
		_$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible");
		if(_$("#twitter ul li.hidden").size()===0){
			var btn = _$("#moretweets").first().get();
			//btn.setAttribute("href","/tweets/page/"+(Math.floor(number_of_tweets/10)+1));
			btn.setAttribute("href","/tweets/");
			btn.setAttribute("onclick", function(){return true;});
		}
		return false;
	});

});

/* google analytics basic setup */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-44278878-1', 'davidayala.me');
ga('send', 'pageview');