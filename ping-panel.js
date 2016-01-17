'use strict';

angular.module("utils-pages", []).run(["$templateCache", function($templateCache) {
	
	$templateCache.put("ping-panel.html", "" +
			"<div class=\"container-fluid\">" + 
			"	<div class=\"row\">" + 
			"		<div class=\"col-md-8 col-md-offset-2\">" + 
			"			<div class=\"input-group\">" + 
			"				<span class=\"input-group-btn\" ng-click=\"ping()\">" + 
			"					<button class=\"btn btn-default\" type=\"button\">Ping</button>" + 
			"				</span>" + 
			"				<input ng-model=\"currentUrl\" " + 
			"					   ng-change=\"ping()\"" + 
			"					   ng-model-options=\"{ debounce: 500 }\"" + 
			"					   type=\"url\" " + 
			"					   class=\"form-control\" " + 
			"					   name=\"currentHost\" " + 
			"					   placeholder=\"Enter valid url, like: http://google.com\">" + 
			"				<span class=\"input-group-btn\" ng-click=\"confirm()\">" + 
			"					<button class=\"btn btn-default\" type=\"button\">Go!</button>" + 
			"				</span>" + 
			"			</div>" + 
			"		</div>" + 
			"	</div>" + 
			"	<div class=\"row\" ng-if=\"lastResult\">" + 
			"" + 
			"		<div class=\"col-md-6 col-md-offset-3 m-b-20\" ng-hide=\"lastResult.pending\">" + 
			"			<div class=\"mini-charts-item bgm-cyan\">" + 
			"				<div class=\"clearfix\">" + 
			"					<div class=\"chart stats-bar min-w-110\">" + 
			"						<h2 ng-bind=\"lastResult.time + 'ms'\" class=\"c-white\"></h2>" + 
			"					</div>" + 
			"					<div class=\"count\">" + 
			"						<span ng-bind=\"lastResult.url\"></span>" + 
			"					</div>" + 
			"				</div>" + 
			"			</div>" + 
			"		</div>" + 
			"" + 
			"		<div class=\"col-md-6 col-md-offset-3 m-b-20\" ng-show=\"lastResult.pending\">" + 
			"			LOADING..." + 
			"		</div>" + 
			"	</div>" + 
			"	<div class=\"row\">" + 
			"		<div class=\"col-md-6 col-md-offset-3 m-b-20\">" + 
			"" + 
			"			<ul class=\"list-group list-group-hover m-t-20\">" + 
			"				<li class=\"list-group-item list-group-item-clickable\"" + 
			"					ng-repeat=\"item in data track by item.url\"" + 
			"					ng-click=\"setSelectedItem(item)\">" + 
			"					<span class=\"badge\" ng-bind=\"::(item.time + 'ms')\"></span> " + 
			"					<span ng-bind=\"::item.url\"></span>" + 
			"				</li>" + 
			"			</ul>" + 
			"		</div>" + 
			"	</div>" + 
			"</div>" + 
			"" 
	);
	 
}]);

angular.module('utils', ['utils-pages'])
.provider('pingProvider', function() {
	var protocols = [
    	"http://"
    ];
	
	var ips = [
        "localhost"
    ];
	
	var ports = [
        ":8080",
        ":8081"
   ];
	
	return {
		setProtocols: function(array) {
			protocols = array;
		},
		setIps: function(array) {
			ips = array;
		},
		setPorts: function(array) {
			ports = array;
		},
		
		addProtocol: function(item) {
			protocols.push(item);
		},
		addIp: function(item) {
			ips.push(item);
		},
		addPort: function(item) {
			ports.push(item);
		},
		
		$get: function() {
			 return {
		        map: function() {
					function cartesian() {
					    var r = [], arg = arguments, max = arg.length-1;
					    function helper(arr, i) {
					        for (var j=0, l=arg[i].length; j<l; j++) {
					            var a = arr.slice(0); // clone arr
					            a.push(arg[i][j]);
					            if (i==max)
					                r.push(a);
					            else
					                helper(a, i+1);
					        }
					    }
					    helper([], 0);
					    return r.map(function(array) {
					    	return array.join("");
					    });
					};
					
					return cartesian(protocols, ips, ports);
				}
		     };
		}
	};                                                                                    
})

.directive('pingPanel', ['pingProvider', 'pingService', function(pingProvider, pingService) {
    return {
		restrict : 'E',
		transclude: true,
		scope : {
			onPick : "&"
		},
		templateUrl: 'ping-panel.html', 
		link : function(scope, elm, attrs) {
			scope.data = new Array();
			
			pingProvider.map().forEach(function(value) {
				pingService(value).then(function(result) {
					scope.data.push({
						url: result.url,
						time: result.delta
					});
					scope.$digest();
				}, function() {
					
				});
			});
			
			scope.setSelectedItem = function(item) {
				scope.currentUrl = item.url;
				scope.ping();
			};
			
			scope.confirm = function() {
				scope.$apply(attrs.onPick); 
			};
			
			scope.ping = function() {
				var timer = setTimeout(function() {
					if (!angular.isDefined(scope.lastResult)) {
						scope.lastResult = new Object();
					}
					console.info(": ", "Start loading for " + scope.currentUrl);
					scope.lastResult.pending = true;
					scope.$digest();
					clearTimeout(timer);
					timer = null;
				}, 60);
				pingService(scope.currentUrl).then(function(result) {
					clearTimeout(timer);
					timer = null;
					scope.lastResult = {
						url: result.url,
						time: result.delta,
						pending: false
					};
					console.info(": ", "End loading for " + scope.currentUrl);
					scope.$digest();
				}, function() {
					scope.lastResult.pending = false;
				});
				
			};
		}
	};                                                                                    
}])

.factory('pingService', ['$window', '$timeout', function($window, $timeout) {
	var requestImage = function(url) {
	    return new Promise(function(resolve, reject) {
	        var img = new Image();
	        img.onload = function() { resolve(img); };
	        img.onerror = function() { reject(url); };
	        img.src = url + '?random-no-cache=' + Math.floor((1 + Math.random()) * 0x10000).toString(16);
	    });
	};

    return function (url, multiplier) {
    	return new Promise(function(resolve, reject) {
	        var start = (new Date()).getTime();
	        var response = function() { 
	            var delta = ((new Date()).getTime() - start);
	            delta *= (multiplier || 1);
	            resolve({
	            	url: url, 
	            	delta: delta 
	            });
	        };
	        
	        requestImage(url).then(response).catch(response);
	        setTimeout(function() { reject(Error('Timeout')); }, 1000);
	    });
    };
}])