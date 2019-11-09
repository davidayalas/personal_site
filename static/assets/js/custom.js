_$().ready(function(){

    _$(".doingnow ul").addClass("default");
    
	_$().getScript("/assets/js/lozad.min.js", function( data, textStatus, jqxhr ) {
		try{
			const observer = window.lozad();
			observer.observe();  
		}catch(e){}
	});

	_$("#moretweets").on("click", function(){
		_$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible");
		//$("#twitter ul li.hidden").slice(0,10).removeClass("hidden").addClass("visible").removeClass("visible");
		if(_$("#twitter ul li.hidden").size()===0){
			_$("#moretweets").remove();
		}
		return false;
	});


	var galleryContainer = _$(".reel").first().get();

	_$(".forward").on("mouseenter",function(){
		window.GalleryRepeater=setInterval(function(){
			scrollTo(galleryContainer, "forward");   
		}, 100);
 	})
	
	 _$(".forward").on("mouseout",function(){
		clearInterval(window.GalleryRepeater)
 	})

	_$(".backward").on("mouseenter",function(){
		window.GalleryRepeater=setInterval(function(){
			scrollTo(galleryContainer, "backward");   
		}, 100);
	})

	_$(".backward").on("mouseout",function(){
		clearInterval(window.GalleryRepeater)
 	})

	var GalleryImage = _$(".reel div").first().get();
	//var GalleryWidth = galleryContainer.offsetWidth;
	//var maxWidth = galleryContainer.scrollWidth-GalleryWidth; //(max width of picture+ margin-left) * 9 pictures
	var maxWidth = GalleryImage.offsetWidth*9; 

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
