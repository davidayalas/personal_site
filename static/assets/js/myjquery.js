(function(window){

	_$ = function(_element){

		var element = null;
		var xhr = null;

        var myDOM = {
            get : function(el){
                if(element) return element;
                return document.querySelectorAll(el);
            },
            append : function(strHTML){
                [].forEach.call(element, function(el) {
                    el.insertAdjacentHTML('beforeend', strHTML);
                }); 
                return this;
			},
            prepend : function(strHTML){
                [].forEach.call(element, function(el) {
                    el.insertAdjacentHTML('afterbegin', strHTML);
                }); 
                return this;
			},
			first : function(){
				for(var item of element.entries()) { 
					element = item[1];
					break;
				}
				return this;
			},
            insertBefore : function(strHTML){
                [].forEach.call(element, function(el) {
                    el.insertAdjacentHTML('beforebegin', strHTML);
                });
                return this;
            },
            addCss : function(style, value){
                [].forEach.call(element, function(el) {
                    el.style[style] = value; // or add a class
                })
                return this;
            },
            removeClass : function(className){
                element.forEach(function(item){
                    item.classList.remove(className);
                });
                return this;
            },
            addClass : function(className){
                element.forEach(function(item){
					item.classList.add(className);
                });
                return this;
            },
            each : function(fn){
                element.forEach(function(item){
                    fn(item);
                });
                return this;
            },
            on : function(eventName, eventHandler){
                Array.prototype.forEach.call(element, function (item) {
                    item.addEventListener(eventName, eventHandler);
                });
                return this;
            },
            slice : function(start, end){
                element = Array.from(element).slice(start, end);
                return this;
            },

            size : function(){
                return element.length;
            },

            empty : function(){
                [].forEach.call(element, function(el) {
                    el.innerHTML = "";
                });
                return this;
            },
            html : function(str){
                [].forEach.call(element, function(el) {
                    el.innerHTML = str;
                });
                return this;
            },
            text : function(str){
                [].forEach.call(element, function(el) {
                    el.textContent = str;
                });
                return this;
            },
            remove : function(){
                [].forEach.call(element, function(el) {
                    el.parentNode.removeChild(el);
                })
                return this;
            },
            ready : function(fn){
                if (document.readyState != 'loading'){
                    fn();
                } else {
                    document.addEventListener('DOMContentLoaded', fn);
                }
			},
			getScript : function(src, callback){
                var callbackFN;
                if(src.indexOf("callback=?")>-1){
                    callbackFN = "mycustomcallback_"+(+new Date());
                    src = src.replace("callback=?","callback=" + callbackFN);
                    window[callbackFN] = function(data){
                        callback(data);
                    }
                }
				var s = document.createElement( "script" );
				s.onload = function(data){
					callback(data);
				}
				s.src = src;
				document.head.appendChild(s);
			},
			request : function(endpoint, callback, method, body, headers){
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
        }

		element = myDOM.get(_element);
        return myDOM;
	}
}(window));