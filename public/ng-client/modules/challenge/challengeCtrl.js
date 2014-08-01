ocApp.controller('challengeCtrl', function($scope, $routeParams, Restangular, $location, $rootScope, $sce, $timeout, $route) {

	$scope.challenge = {
		pages: [],
		header_images: [],
		submit_fields: [],
		stages: [],
		categories: []
	};

	$scope.filterObj = {
		important: true
	};

	$scope.filter = {};

	$scope.order = "";

	$scope.currentStages = [];

	$scope.fieldOrders = [1,2,3,4,5,6,7,8,9];

	$scope.isAdmin = false;

	$scope.submited = false;

	$scope.newTitle = 'sin-titulo-0';

	//Inits
	$scope.editProjectsInit = function(){
		$scope.checkCanEdit();
		if(!$rootScope.user || !$scope.userCanEdit){
			$location.path('/challenge/'+$routeParams.challengeId);
		}
		$scope.isAdmin = true;
		$scope.loadChallenge(false);
	};

	$scope.checkCanEdit = function(){
		if($rootScope.user){
			$scope.userCanEdit = ($rootScope.user.admin_in.indexOf($routeParams.challengeId) >= 0);
		}
	};

	$scope.applyAccordion = function(){
		$('.collapse').collapse();
	}

	$scope.getTitle = function(page){
		return page.title ? page.title : 'Sin título';
	}

	$scope.editInit = function(){
		$scope.checkCanEdit();
		if(!$rootScope.user || !$scope.userCanEdit){
			$location.path('/challenge/'+$routeParams.challengeId);
		}
		$scope.projectOptionsAll = Restangular.allUrl('projects/schema').getList().$object;
		$scope.loadChallenge(true);
	};

	$scope.addInit = function(){
		if(!$rootScope.user){
			$location.path('/home');
		}
	};

	$scope.viewInit = function(){
		$scope.checkCanEdit();
		$scope.loadChallenge(false);
		$scope.project = {}; //NEW
		$('#myTab').on('click', 'a', function (e) {
		  e.preventDefault();
		  $(this).tab('show');
		});
		
	};

	//Common
	$scope.loadChallenge = function(isEdit){
		if($routeParams.challengeId){
			Restangular.one('dashboards', $routeParams.challengeId).get()
				.then(function(challenge){
			  		$scope.challenge = challenge;
			  		$scope.currentStages = $rootScope.getCurrentStages(challenge);
			  		$rootScope.title = ' - ' + $scope.challenge.title;
			  		if(isEdit){
			  			$scope.preprocessCollections();
			  		}else{
			  			$scope.allowHtmlInPages();
			  		}
				});
				if($scope.isAdmin){
					$scope.projects = Restangular.one('admin_dashboards', $routeParams.challengeId).getList('projects').$object;
				} else {
					$scope.projects = Restangular.one('dashboards', $routeParams.challengeId).getList('projects').$object;
				}
			$scope.admins = Restangular.one('dashboards', $routeParams.challengeId).getList('admins').$object;
		}
	};

	$scope.explicitlyTrustedHtml = $sce.trustAsHtml(
      '<span onmouseover="this.textContent="Explicitly trusted HTML bypasses ' +
      'sanitization."">Hover over this text.</span>');

	$scope.allowHtmlInPages = function(){
		
		//permissions
		angular.forEach($scope.challenge.pages, function(s,k){
			s.text = $sce.trustAsHtml(s.text);
		});

	};

	$scope.preprocessCollections = function(){
		
		//permissions
		angular.forEach($scope.challenge.stages, function(s,k){
			s.permissionOptions = $rootScope.permissions;
			s.permissionOptions = s.permissionOptions.filter(function(e){
				return s.permissions.indexOf(e)<0;
 			});
		});

		$scope.projectOptions = $scope.projectOptionsAll;

		angular.forEach($scope.challenge.submit_fields, function(s,k){
			$scope.projectOptions.splice($scope.projectOptions.indexOf(s.type),1);
		});

	};

	//Interaction
	$scope.addStage = function(){
		$scope.challenge.stages.push({permissions:[], permissionOptions:$rootScope.permissions});
	};

	$scope.addPermission = function(stage){
		if(stage.selectedPermission){
			stage.permissions.push(stage.selectedPermission);
			stage.permissionOptions.splice(stage.permissionOptions.indexOf(stage.selectedPermission),1);
			stage.selectedPermission = '';
		}
	};

	$scope.addSubmitField = function(submitField){
		if(submitField.type && submitField.label && submitField.help && submitField.order){
			submitField.important = (submitField.important == "true");
			$scope.challenge.submit_fields.push(angular.copy(submitField));
			$scope.projectOptions.splice($scope.projectOptions.indexOf(submitField.type),1);
			submitField.type = '';
			submitField.help = '';
			submitField.label = '';
			submitField.order = '';
			submitField.important = false;
		}
	};

	$scope.removeSubmitField = function(index){
		$scope.challenge.submit_fields[index];
		$scope.projectOptions.push($scope.challenge.submit_fields[index].type);
		$scope.challenge.submit_fields.splice(index, 1);
	};

	$scope.removePermission = function(stage,index){
		stage.permissionOptions.push(stage.permissions[index]);
		stage.permissions.splice(index, 1);
	};

	$scope.addProject = function(project){

		$('#participate').modal('hide');
		$('body').removeClass('modal-open');

		project.challenge_id = $scope.challenge._id;

		Restangular.all("projects")
			.post(project)
			.then(function(e){
				$location.path('/submit/'+e._id);
			}, function(response) {
				console.log("Error with status code", response.status);
			});

	};

	$scope.openParticipatePopup = function(id){
		if($rootScope.user){
			$('#participate').modal('show');
		} else {
			$location.path('/login');
		}
	};

	$scope.openProjectPopup = function(id){
		$('#project-'+id).modal('show');
	};

	$scope.changeFilter = function() {
      $scope.projects = [];
      Restangular.one('dashboards', $routeParams.challengeId).getList('projects',{cat:$scope.filter.cat,order:$scope.order})
		.then(function(projects){
			if($scope.order=='votes'){
				$scope.projects = projects.sort(function(a,b){
					return a.followers.length < b.followers.length;
				});
			}else{
				$scope.projects = projects;
			}
		});
    };

	//Submits
	$scope.add = function(challenge){
		Restangular.all('dashboards')
			.post(challenge)
			.then(function(e){
				$rootScope.refreshUser(function(){
					$location.path('/challenge/'+e._id+'/edit');
				});
			});
	};

	$scope.update = function(challenge, formChallenge){
		if(formChallenge.$valid){
			angular.forEach(challenge.stages, function(s,k){
				delete s.permissionOptions;
			});

			challenge.put().then(function(e){
				$location.path('/challenge/'+e._id);
			});
		}else{
			$scope.submited = true;
			$timeout(function(){
				document
				.querySelector('.form-error:not(.ng-hide)')
				.parentNode
				.scrollIntoView(true);
			}, 0);
		}
	};

	$scope.updateSubmit = function(submit){
		submit.put().then(function(e){
			$('#project-'+submit._id).modal('hide');
		});
	};

	$scope.cancelSubmit = function(id){
		$('#project-'+id).modal('hide');
		$scope.editProjectsInit();
	};

});