
var MV = {
	max: 0,
	curr: 0,
	api: {
		updateFile: function(url){
			$.get(url, function(msg){
				MV.curr++;
				$('.count').html(MV.curr + ' of '+MV.max);
				$('.console').append(msg + '<br />');
			});
		},
		init: function(){
			$('#updateFile').click(MV.api.genUpdateList);

		},
		genUpdateList: function(){
			$('.console, .count').html('');
			var urlList = [];
			var baseRoutes = $('#baseRoutes').val();
			var serverList = $('#serverList').val();
			MV.max = baseRoutes.length * serverList.length;
			MV.curr = 0;
			_.each(baseRoutes, function(br){
				urlList.push(br+'/'+serverList.join());
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