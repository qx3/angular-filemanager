(function(angular) {
    "use strict";
    angular.module('FileManagerApp').service('fileNavigator', [
        '$http', '$q', 'fileManagerConfig', 'item', '$rootScope', function ($http, $q, fileManagerConfig, Item, $rootScope) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var FileNavigator = function() {
                this.requesting = false;
                this.fileList = [];
                this.currentPath = [];
                this.history = [];
                this.error = '';
      			this.parentId = '';
      			this.id = '';
      			this.folderInfo = [];
        };

        FileNavigator.prototype.deferredHandler = function(data, deferred, defaultMsg) {

            if (!data || typeof data !== 'object') {
                this.error = 'Bridge response error, please check the docs';
            }
            if (!this.error && data && data.error) {
                this.error = data.error;
            }
            if (!this.error && data.error) {
                this.error = data.error.message;
            }
            if (!this.error && defaultMsg) {
                this.error = defaultMsg;
            }
            if (this.error) {
                return deferred.reject(data);
            }
            return deferred.resolve(data);
        };



        FileNavigator.prototype.list = function(item) {

            var contentId = $rootScope.contentId;
            var self = this;
            var deferred = $q.defer();
            var path = self.currentPath.join('/');
            var parentId = null;
            var startDate = null;
            var endDate = null;
            var fileName = "";
            var contentType = "";

            if($rootScope.parentId != undefined && $rootScope.parentId != ""){
                parentId = $rootScope.parentId;
            }
            else {
                self.currentPath = [];
            }

			if($rootScope.dtPickersQuery != null){
				startDate = $rootScope.dtPickersQuery.startDate;
				endDate = $rootScope.dtPickersQuery.endDate;
			}

			if($rootScope.fileNameQuery != undefined){
				fileName = $rootScope.fileNameQuery;
			}
			if($rootScope.contetTypeQuery != undefined){
				contentType = $rootScope.contetTypeQuery;
			}

			var data = {
    				parentId: parentId,
    				startDate: startDate,
    				endDate: endDate,
    				fileName: fileName,
    				contentType: contentType,
                    contentId: contentId
            };

            self.requesting = true;
            self.fileList = [];
            self.error = '';

            $http.post(fileManagerConfig.listUrl, data).success(function(data) {
                $rootScope.listFiles = data;
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'Unknown error listing, check the response');
            })['finally'](function(data) {
                self.requesting = false;
            });
            return deferred.promise;
        };

        FileNavigator.prototype.refresh = function() {
            var self = this;
            var path = self.currentPath.join('/');
            return self.list().then(function(data) {
                self.fileList = (data || []).map(function(file) {
                    return new Item(file, self.currentPath);
                })
                self.buildTree(path);
            });
        };

        FileNavigator.prototype.buildTree = function(path) {
            var self = this;
            function recursive(parent, item, path) {
                var absName = path ? (path + '/' + item.model.name) : item.model.name;
                if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
                    parent.nodes = [];
                }
                if (parent.name !== path) {
                    for (var i in parent.nodes) {
                        recursive(parent.nodes[i], item, path);
                    }
                } else {
                    for (var e in parent.nodes) {
                        if (parent.nodes[e].name === absName) {
                            return;
                        }
                    }
                    parent.nodes.push({item: item, name: absName, nodes: []});
                }
                parent.nodes = parent.nodes.sort(function(a, b) {
                    return a.name < b.name ? -1 : a.name === b.name ? 0 : 1;
                });
            };

            !self.history.length && self.history.push({name: path, nodes: []});
            for (var o in self.fileList) {
                var item = self.fileList[o];
                item.isFolder() && recursive(self.history[0], item, path);
            }
        };

        FileNavigator.prototype.folderClick = function(item) {
            var self = this;
            self.currentPath = [];
            if (item && item.isFolder()) {
                self.currentPath = item.model.fullPath().split('/').splice(1);
                self.id = item.model.id;
                self.folderInfo.push({id: item.model.id, folder: item.model.name});
                $rootScope.parentId = self.id;
                $rootScope.fullPath = item.model.fullPath();
            }
            self.refresh();
        };

        FileNavigator.prototype.upDir = function() {
            var self = this;
            if (self.currentPath[0]) {
                self.currentPath = self.currentPath.slice(0, -1);
				if(self.currentPath.length > 0){
					for(var i = 0; i < self.folderInfo.length; i++){
						if(self.folderInfo[i].folder == self.currentPath.toString()){
							self.id = self.folderInfo[i].id;
						}
					}
				}else{
					self.id = "";
				}
				$rootScope.fullPath = self.currentPath.join('/');
				$rootScope.parentId = self.id;
                self.refresh();
            }
        };

        FileNavigator.prototype.goTo = function(index) {
            var self = this;
            self.currentPath = self.currentPath.slice(0, index + 1);

			if(self.currentPath.length > 0){
				for(var i = 0; i < self.folderInfo.length; i++){
					if(self.folderInfo[i].folder == self.currentPath[self.currentPath.length - 1]){
						self.id = self.folderInfo[i].id;
					}
				}
			}else{
				self.id = "";
			}
			$rootScope.fullPath = self.currentPath.join('/');
			$rootScope.parentId = self.id;
            
            self.refresh();
        };

        FileNavigator.prototype.fileNameExists = function(fileName) {
            var self = this;
            for (var item in self.fileList) {
                item = self.fileList[item];
                if (fileName.trim && item.model.name.trim() === fileName.trim()) {
                    return true;
                }
            }
        };

        FileNavigator.prototype.listHasFolders = function() {
            var self = this;
            for (var item in self.fileList) {
                if (self.fileList[item].model.type === 'dir') {
                    return true;
                }
            }
        };

        return FileNavigator;
    }]);
})(angular);
