(function(window, angular, $) {
    "use strict";
    angular.module('FileManagerApp').controller('FileManagerCtrl', [
    '$scope', '$translate', '$rootScope', '$cookies', 'fileManagerConfig', 'item', 'fileNavigator', 'fileUploader', 'session', '$http',
    function($scope, $translate, $rootScope, $cookies, fileManagerConfig, Item, FileNavigator, FileUploader, session, $http) {
        $scope.config = fileManagerConfig;
        $scope.appName = fileManagerConfig.appName;

        $scope.reverse = false;
        $scope.predicate = ['model.type', 'model.name'];
        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
            $scope.predicate[1] = predicate;
        };

        $scope.query = '';
        $scope.temp = new Item();
        $scope.fileNavigator = new FileNavigator();
        $scope.fileUploader = FileUploader;
        $scope.uploadFileList = [];
        $scope.viewTemplate = $cookies.viewTemplate || 'main-table.html';

        $scope.setTemplate = function(name) {
            $scope.viewTemplate = $cookies.viewTemplate = name;
        };

		$scope.changeLanguage = function (locale) {
            if (locale) {
                return $translate.use($cookies.language = locale);
            }
            $translate.use($cookies.language || fileManagerConfig.defaultLang);
        };

        $scope.contentId = window.location.href.split("documents/")[1];

		$scope.$watch('datePickers', function (v) {
			$rootScope.dtPickersQuery = $scope.datePickers;
			$scope.fileNavigator.refresh();
		});

		$scope.$watch('searchQuery', function (v) {
			$rootScope.fileNameQuery = $scope.searchQuery;
			$scope.fileNavigator.refresh();
		});

		$scope.$watch('contentType', function (v) {
			$rootScope.contetTypeQuery = $scope.contentType;
			$scope.fileNavigator.refresh();
		});


        $scope.touch = function(item) {
            item = item instanceof Item ? item : new Item();
            item.revert && item.revert();
            $scope.temp = item;
        };

        $scope.smartClick = function(item) {
            if (item.isFolder()) {
                return $scope.fileNavigator.folderClick(item);
            }
            if (item.isImage()) {
                return item.preview();
            }
            if (item.isEditable()) {
                item.getContent();
                $scope.touch(item);
                return $scope.modal('edit');
            }
        };

        $scope.modal = function(id, hide) {
            $('#' + id).modal(hide ? 'hide' : 'show')
        };

        $scope.isInThisPath = function(path) {
            var currentPath = $scope.fileNavigator.currentPath.join('/');
            return currentPath.indexOf(path) !== -1;
        };

        $scope.edit = function(item) {
			var data = {
				companyToken: sessionStorage.getItem('company'),
				parentId: $rootScope.parentId,
				startDate: null,
				endDate: null,
				fileName: "",
				contentType: "",
        		contentId: $scope.contentId
			};
			var error = false;

			$http.post(fileManagerConfig.listUrl, data).success(function(data) {

				if (!error) {
					item.edit().then(function () {
						$scope.modal('edit', true);
					});
				}
			});
        };

        $scope.move = function(item) {
			var data = {
				companyToken: sessionStorage.getItem('company'),
				parentId: $rootScope.parentIdChange,
				startDate: null,
				endDate: null,
				fileName: "",
				contentType: "",
        		contentId: $scope.contentId
			};
			var error = false;
			$http.post(fileManagerConfig.listUrl, data).success(function(data) {
				for(var y = 0; y < data.length; y++){
					if(data[y].name == item.tempModel.name){
						error = true;
						$scope.temp.error = "A pasta de destino contém um arquivo com o mesmo nome.";
						//item.error = $translate.instant('error_invalid_filename');
					}
				}

				if(!error){
					var samePath = item.tempModel.path.join() === item.model.path.join();
					if (samePath && $scope.fileNavigator.fileNameExists(item.tempModel.name)) {
						item.error = "Nome de arquivo inválido";
						//item.error = $translate.instant('error_invalid_filename');
						return false;
					}
					item.move().then(function() {
						$scope.fileNavigator.refresh();
						$scope.modal('move', true);
					});
				}
			});



        };

        $scope.remove = function(item) {
            item.remove().then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('delete', true);
            });
        };

        /*$scope.rename = function(item) {
            var samePath = item.tempModel.path.join() === item.model.path.join();
            if (samePath && $scope.fileNavigator.fileNameExists(item.tempModel.name)) {
                item.error = "Nome de arquivo inválido";
				//item.error = $translate.instant('error_invalid_filename');
                return false;
            }
            item.rename().then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('rename', true);
            });
        };*/

        $scope.createFolder = function(item) {
            var name = item.tempModel.name && item.tempModel.name.trim();
            item.tempModel.type = 'dir';
            item.tempModel.path = $scope.fileNavigator.currentPath;

			var error = false;

			for(var y = 0; y < $rootScope.listFiles.length; y++){
				if($rootScope.listFiles[y].name == name){
					error = true;
					$scope.temp.error = "Não é permitido pasta com mesmo nome na mesma pasta: "+name;
					//item.error = $translate.instant('error_invalid_filename');
				}
			}
            if(!error){
				if (name && !$scope.fileNavigator.fileNameExists(name)) {
					item.createFolder().then(function() {
						$scope.fileNavigator.refresh();
						$scope.modal('newfolder', true);
					});
				} else {
					$scope.temp.error = "Nome de diretório inválido";
					//item.error = $translate.instant('error_invalid_filename');
					return false;
				}
			}

        };

        $scope.uploadFiles = function(item) {
			var error = false;
			var fileNameError = "";
			for(var x = 0; x <  $scope.uploadFileList.length; x++){
				for(var y = 0; y < $rootScope.listFiles.length; y++){
					if($rootScope.listFiles[y].name == $scope.uploadFileList[x].name){
						error = true;
						fileNameError += " " +$rootScope.listFiles[y].name;
					}
				}
			}
			if(!error){
				$scope.fileUploader.upload($scope.uploadFileList, $rootScope.fullPath, item).then(function() {
					$scope.fileNavigator.refresh();
					$scope.modal('uploadfile', true);
				}, function(data) {
					var errorMsg = data.result && data.result.error || 'Erro ao fazer upload do arquivo';
					//var errorMsg = data.result && data.result.error || $translate.instant('error_uploading_files');
					$scope.temp.error = errorMsg;
				});
			}else{
				$scope.temp.error = "Não é permitido arquivos com mesmo nome na mesma pasta: "+fileNameError;
				//item.error = $translate.instant('error_invalid_filename');
			}

        };

        $scope.getQueryParam = function(param) {
            var found;
            window.location.search.substr(1).split("&").forEach(function(item) {
                if (param ===  item.split("=")[0]) {
                    found = item.split("=")[1];
                    return false;
                }
            });
            return found;
        };

		//$scope.changeLanguage($scope.getQueryParam('lang'));
        $scope.isWindows = $scope.getQueryParam('server') === 'Windows';
        $scope.fileNavigator.refresh();
    }]);
})(window, angular, jQuery);
