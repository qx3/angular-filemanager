(function(window, angular) {
    "use strict";

    angular.module('FileManagerApp').service('fileUploader', ['$http', '$q', 'fileManagerConfig', '$rootScope',  function ($http, $q, fileManagerConfig, $rootScope) {

        function deferredHandler(data, deferred, errorMessage) {
            if (!data || typeof data !== 'object') {
                return deferred.reject('Bridge response error, please check the docs');
            }
            if (data.result && data.result.error) {
                return deferred.reject(data);
            }
            if (data.error) {
                return deferred.reject(data);
            }
            if (errorMessage) {
                return deferred.reject(errorMessage);
            }
            deferred.resolve(data);
        }

        this.requesting = false;
        this.upload = function(fileList, path, item) {
            if (! window.FormData) {
                throw new Error('Unsupported browser version');
            }
            var self = this;
            var form = new window.FormData();
            var deferred = $q.defer();
            form.append('eventId', $rootScope.eventId);

			if(path != undefined){
				form.append('fullPath', path);
			}
			if($rootScope.parentId != undefined){
				form.append('parentId', $rootScope.parentId);
			}

			if(item.tempModel.dueDate != undefined){
				var d = new Date(item.tempModel.dueDate.startDate);
				var dd = d.getDate();
				var mm = d.getMonth()+1;
				var yyyy = d.getFullYear();

				if(dd<10){
					dd='0'+dd
				}
				if(mm<10){
					mm='0'+mm
				}
				var dtFormat = dd+'/'+mm+'/'+yyyy;

				form.append('dueDate', dtFormat);
			}
			if(item.tempModel.value != undefined){
				form.append('value', item.tempModel.value);
			}
      var contentId = window.location.href.split("documents/")[1];

      form.append('contentId', contentId);

            for (var i = 0; i < fileList.length; i++) {
                var fileObj = fileList.item(i);
                fileObj instanceof window.File && form.append('file-' + i, fileObj);
            }
            self.requesting = true;
            $http.post(fileManagerConfig.uploadUrl, form, {
                transformRequest: angular.identity,
                headers: {
                    "Content-Type": undefined
                }
            }).success(function(data) {
                deferredHandler(data, deferred);
            }).error(function(data) {
                deferredHandler(data, deferred, 'Unknown error uploading files');
            })['finally'](function(data) {
                self.requesting = false;
            });;

            return deferred.promise;
        };
    }]);
})(window, angular);
