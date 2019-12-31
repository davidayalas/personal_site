_$().ready(function(){

	_$(".doingnow ul").addClass("default");

	const observer = window.lozad();
	observer.observe();  

	_$("#moretweets").on("click", function(){
		_$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible");
		if(_$("#twitter ul li.hidden").size()===0){
			let tweets_button = _$("#moretweets").first().get();
			tweets_button.setAttribute("href","/tweets/page/4");
			tweets_button.setAttribute("onclick", function(){return true;});
		}
		return false;
	});


	var galleryContainer = _$(".reel").first().get();

	_$(".forward").on("mouseenter",function(){
		window.GalleryRepeater=setInterval(function(){
			scrollTo(galleryContainer, "forward");   
		}, 100);
 	});
	
	_$(".forward").on("mouseout",function(){
		clearInterval(window.GalleryRepeater);
 	});

	_$(".backward").on("mouseenter",function(){
		window.GalleryRepeater=setInterval(function(){
			scrollTo(galleryContainer, "backward");   
		}, 100);
	});

	_$(".backward").on("mouseout",function(){
		clearInterval(window.GalleryRepeater)
 	});

	var GalleryWidth = galleryContainer.offsetWidth;
	var maxWidth = galleryContainer.scrollWidth-GalleryWidth; //(max width of picture+ margin-left) * 9 pictures
	
	function scrollTo(container, direction) {
		var movement = 75;
		window.GalleryTranslate = window.GalleryTranslate || 0;

		if(direction==="forward" && (maxWidth>window.GalleryTranslate*-1)){
			window.GalleryTranslate = window.GalleryTranslate-movement;
		}else if(direction==="backward" && (window.GalleryTranslate*-1)>0){
			window.GalleryTranslate = window.GalleryTranslate+movement;
		}
		container.style.transform = "translateX(" + window.GalleryTranslate + "px" + ")";
	}

});

/* google analytics basic setup */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-44278878-1', 'davidayala.eu');
ga('send', 'pageview');