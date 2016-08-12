(function(window, angular, $) {
    "use strict";
    angular.module('FileManagerApp').factory('item', ['$http', '$q', '$translate', 'fileManagerConfig', '$rootScope', function($http, $q, $translate, fileManagerConfig, $rootScope) {

        var Item = function(model, path) {
            var rawModel = {
                name: model && model.Name || '',
                path: path || [],
                type: typeFile(model && model.Name, model && model.Type),
                size: model && parseInt(model.Size || 0),
                date: parseDateDDmmAAAA(model && model.Date),
                perms: model && model.rights,
                content: model && model.content || '',
                recursive: false,
                sizeKb: function() {
                    return Math.round(this.Size / 1024, 1);
                },
                fullPath: function() {
                    return ('/' + this.path.join('/') + '/' + this.name).replace(/\/\//, '/');
                },
				        parentId: model && model.ParentId || '',
				        id: model && model.Id || ''
              };

              this.error = '';
              this.inprocess = false;

              this.model = angular.copy(rawModel);
              this.tempModel = angular.copy(rawModel);



        function parseDateDDmmAAAA(mysqlDate) {
            var d = (mysqlDate || '').toString().split(/[/ :]/);
				    var retorno = '';
    				if(d[0] != undefined && d[1] != undefined && d[2] != undefined){
    					retorno = d[0]+"/"+d[1]+"/"+d[2];
    				}
            return retorno;
        }

			function typeFile(fileName, type){
				var retorno = 'dir';
				var t = (fileName || '').toString().split('.');
				if(type != 'dir'){
					retorno = t[t.length - 1];
				}

				return retorno;
			}
        };

        Item.prototype.update = function() {
            angular.extend(this.model, angular.copy(this.tempModel));
        };

        Item.prototype.revert = function() {
            angular.extend(this.tempModel, angular.copy(this.model));
            this.error = '';
        };

        Item.prototype.deferredHandler = function(data, deferred, defaultMsg) {
            if (!data || typeof data !== 'object') {
                this.error = 'Bridge response error, please check the docs';
            }
            if (data.result && data.result.error) {
                this.error = data.result.error;
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
            this.update();
            return deferred.resolve(data);
        };

        var contentId = window.location.href.split("documents/")[1];

        Item.prototype.createFolder = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {
			    //companyToken: sessionStorage.getItem('company'),
                parentId: $rootScope.parentId,
                fileName: self.tempModel.name,
                contentId: contentId
            };

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.createFolderUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'erro ao criar o diretório');
                //self.deferredHandler(data, deferred, $translate.instant('error_creating_folder'));
            })['finally'](function(data) {
                self.inprocess = false;
            });

            return deferred.promise;
        };

        Item.prototype.move = function() {
            var self = this;
            var deferred = $q.defer();

			var fullPath = self.model.fullPath();
			fullPath = fullPath.replace(new RegExp('/', 'g'), '|');

			var destinationFullPath = self.tempModel.path.join('/');
			if(destinationFullPath == undefined){
				destinationFullPath = '';
			}
			destinationFullPath = destinationFullPath.replace(new RegExp('/', 'g'), '|');

			var dueDate = "";
			if(self.tempModel.dueDate != undefined){
				var d = new Date(self.tempModel.dueDate.startDate);
				var dd = d.getDate();
				var mm = d.getMonth()+1;
				var yyyy = d.getFullYear();

				if(dd<10){
					dd='0'+dd
				}
				if(mm<10){
					mm='0'+mm
				}
				var dtFormat = mm+'/'+dd+'/'+yyyy;

				dueDate =  dtFormat;
			}

			var data = {
				documentToken: self.model.downloadToken,
				fullPath: fullPath,
				destinationFileName: self.tempModel.name,
				destinationFullPath: destinationFullPath,
				parentId: $rootScope.parentIdChange

			};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.renameUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, "erro ao alterar");
                //self.deferredHandler(data, deferred, $translate.instant('error_renaming'));
            })['finally'](function() {
                self.inprocess = false;
            });

            return deferred.promise;
        };

		Item.prototype.edit = function() {
			var self = this;
			var deferred = $q.defer();

			var fullPath = self.model.fullPath();
			fullPath = fullPath.replace(new RegExp('/', 'g'), '|');

			var destinationFullPath = $rootScope.fullPath;
			if($rootScope.fullPath == undefined){
				destinationFullPath = '';
			}
			destinationFullPath = destinationFullPath.replace(new RegExp('/', 'g'), '|');


			var data = {
				documentToken: self.model.downloadToken,
				fullPath: fullPath,
				destinationFileName: self.tempModel.name,
				destinationFullPath: destinationFullPath,
				parentId: $rootScope.parentIdChange
			};

			self.inprocess = true;
			self.error = '';
			$http.post(fileManagerConfig.renameUrl, data).success(function(data) {
				self.deferredHandler(data, deferred);
			}).error(function(data) {
				self.deferredHandler(data, deferred, "erro ao alterar");
                //self.deferredHandler(data, deferred, $translate.instant('error_copying'));
			})['finally'](function() {
				self.inprocess = false;
			});
			return deferred.promise;
		};
        Item.prototype.download = function (options, name, callbackSuccess, callbackError) {
                    var name = this.model.name;
                    var promise = $http({
                                          method: 'GET',
                                          url: fileManagerConfig.downloadFileUrl  +'/?id=' + this.model.id + '&name=' + this.model.name,
                                          responseType: 'arraybuffer'
                                      }, this.model);

                        promise.success(function (data, status, headers) {
                            fileDownload(name, data, headers);
                          });
                          promise.error(function (data, status) {
                          });
                  };

        Item.prototype.preview = function() {
            var self = this;
            return self.download(true);
        };

	    Item.prototype.remove = function() {
            var self = this;
            var deferred = $q.defer();

			     var path = self.model.fullPath();
			     path = path.replace(new RegExp('/', 'g'), '|');


            var data = {
                id: self.model.id,
                fullPath: path
            };

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.removeUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, "erro ao deletar");
                //self.deferredHandler(data, deferred, $translate.instant('error_extracting'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.isFolder = function() {
            return this.model.type === 'dir';
        };

        Item.prototype.isEditable = function() {
			return !this.isFolder() && fileManagerConfig.isEditableFilePattern.test(this.model.name);

        };

        Item.prototype.isImage = function() {
            return fileManagerConfig.isImageFilePattern.test(this.model.name);
        };

		Item.prototype.isViewable = function() {
			return fileManagerConfig.isViewableFilePattern.test(this.model.name);
		};



        return Item;
    }]);
})(window, angular, jQuery);
