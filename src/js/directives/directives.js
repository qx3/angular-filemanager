(function(angular) {
    "use strict";
    var app = angular.module('FileManagerApp');

    app.directive('angularFilemanager', ['$parse', 'fileManagerConfig', function($parse, fileManagerConfig) {

        return {
            restrict: 'EA',
            //templateUrl: 'bower_components/angular-filemanager/src/templates/main.html'
            templateUrl: fileManagerConfig.tplPath + '/main.html'
        };
    }]);

    app.directive('ngFile', ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var model = $parse(attrs.ngFile);
                var modelSetter = model.assign;

                element.bind('change', function() {
                    scope.$apply(function() {
                        modelSetter(scope, element[0].files);
                    });
                });
            }
        };
    }]);

    app.directive('ngRightClick', ['$parse', function($parse) {
        return function(scope, element, attrs) {
            var fn = $parse(attrs.ngRightClick);
            element.bind('contextmenu', function(event) {
                scope.$apply(function() {
					event.preventDefault();
                    fn(scope, {$event: event});
                });
            });
        };
    }]);

	app.directive('monthYearMask', function () {
		return {
			link: function (scope, element) {
				$(element).on('keyup', function () {
					var text = this.value.replace(/\D/g, '');

					if (text.length > 6) {
						text = text.substring(0, 6);
					}
					if (text.length > 2) {
						text = text.substring(0, 2) + '/' + text.substring(2);
					}
					if(text.length == 2){
						if(text > 12 || text == 0){
							text = "";
						}
					}

					this.value = text;
				});
			}
		};
	});

})(angular);
