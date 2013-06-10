//

var updateCache = function(){
	var list = $('input:checked:not(.select-all)');

	_.each(list, function(el){

		update(el);

	});
};

var update = function(el){
	$el = $(el);
	var url = $el.data('url');

	var $eParent = $el.parent();
	$eParent.addClass('loading');
	var start = new Date().getTime();

	// .append('<span class="time">('+time+'ms)</span>')
	//
	// $.getScript('http://www.mountvacation.com'+url+'/?cache=true_', function( msg ) {
	// 	// var end = new Date().getTime();
	// 	// var time = end - start;
	// 	$el.parent().removeClass('loading').addClass('done');
	// });
	// }

		$.ajax({
			type: "GET",
			dataType: 'text',
			context: $eParent,
			url: 'http://www.mountvacation.com'+url+'/?cache=true',
		}).always(function( msg ) {
			var end = new Date().getTime();
			var time = (end - start) /1000;
			$(this).removeClass('loading').addClass('done').append('<span class="time">('+time+'s)</span>');
		});
}

$(function () {

	//toggle all
	$('.select-all').click(function(){
		$el = $(this);
		var checkBoxes = $el.siblings('ul').find('input:checkbox');
		checkBoxes.prop("checked", !checkBoxes.prop("checked"));
	});

	//btn
	$('.updateCache').click(updateCache);
	//

});