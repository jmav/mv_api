
var MV = {
	api: {
		updateFile: function(url){
			$.get(url, function(msg){
				$('.console').append(msg + '<br />');
			});
		},
		init: function(){
			$('#updateFile').click(MV.api.genUpdateList);

		},
		genUpdateList: function(){
			var urlList = [];
			var baseRoutes = $('#baseRoutes').val();
			var serverList = $('#serverList').val();
			_.each(baseRoutes, function(br){
				_.each(serverList, function(sl){
					urlList.push(br+'/'+sl);
				});
			});
			_.each(urlList, function(val){
				MV.api.updateFile(val);

			});
		}
	}
};

$(function() {
	MV.api.init();
});