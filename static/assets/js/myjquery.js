(function(window){

	window._$ = function(_element){

		var element = null;
		try{
			element = document.querySelectorAll(_element);
		}catch(e){
			element = _element;
		}

		var xhr = null;

		this.get = function(){
			return element;
		}

		this.appendTo = function(el){
			if(!document.querySelector(el)) return;
			document.querySelector(el).insertAdjacentHTML('beforeend', element);
			return this;
		}

		this.first = function(){
			for(var item of element.entries()) { 
				element = item[1];
				break;
			}
			return this;
		}

		this.addCss = function(style, value){
			[].forEach.call(element, function(el) {
				el.style[style] = value; // or add a class
			})
			return this;
		}

		this.removeClass = function(className){
			element.forEach(function(item){
				item.classList.remove(className);
			});
			return this;
		}

		this.addClass = function(className){
			element.forEach(function(item){
				item.classList.add(className);
			});
			return this;
		}

		this.on = function(eventName, eventHandler){
			Array.prototype.forEach.call(element, function (item) {
				item.addEventListener(eventName, eventHandler);
			});
			return this;
		}

		this.slice = function(start, end){
			element = Array.from(element).slice(start, end);
			return this;
		}

		this.size = function(){
			return element.length;
		}

		this.remove = function(){
			[].forEach.call(element, function(el) {
				el.parentNode.removeChild(el);
			})
			return this;
		}

		this.ready = function(fn){
			if (document.readyState != 'loading'){
			fn();
			} else {
			document.addEventListener('DOMContentLoaded', fn);
			}
		}

		this.getScript = function(src, callback){
			var s = document.createElement( "script" );
			s.onload = function(){
				callback();
			}
			s.src = src;
			document.head.appendChild(s);
		}

		this.request = function(endpoint, callback, method, body, headers){
			var jsonp = false;
			if(!xhr){
				xhr = new XMLHttpRequest();
			}
			method = method || "GET";
			if ('withCredentials' in xhr) {
				callbackFN = "mycustomcallback_"+(+new Date());
				if(endpoint.indexOf("callback=?")>-1){
					endpoint = endpoint.replace("callback=?","callback=" + callbackFN);
					jsonp = true;
					window[callbackFN] = function(data){
						callback(data);
					}
				}
				xhr.open(method, endpoint, true);
				xhr.setRequestHeader('Content-Type', 'application/json');
				for(var k in headers){
					xhr.setRequestHeader(k, headers[k]);
				}
				xhr.onreadystatechange = function() {
					if (this.readyState==4 && this.status==200) {
					var data = this.responseText;
					if(jsonp){
						var s = document.createElement( "script" );
						s.text = data;
						document.head.appendChild(s);
						return;  
					}
					callback(data);
					} else {
					}
				};
				xhr.send(JSON.stringify(body));
			}
		}
		return this;
	}
}(window));