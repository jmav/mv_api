//Šifranti

var codelists = {
	weatherSymbolsPercentage: {
		'Blizzard.gif'                      :1, //if 0 then it will mix with resorts without any forecast
		'Clear.gif'                         :75,
		'CloudRainThunder.gif'              :1,
		'CloudSleetSnowThunder.gif'         :1,
		'Cloudy.gif'                        :30,
		'Fog.gif'                           :1,
		'Mist.gif'                          :1,
		'FreezingDrizzle.gif'               :1,
		'FreezingFog.gif'                   :1,
		'FreezingRain.gif'                  :1,
		'HeavyRain.gif'                     :1,
		'HeavyRainSwrsDay.gif'              :1,
		'HeavyRainSwrsNight.gif'            :1,
		'HeavySleet.gif'                    :1,
		'HeavySleetSwrsDay.gif'             :1,
		'HeavySleetSwrsNight.gif'           :1,
		'HeavySnow.gif'                     :1,
		'HeavySnowSwrsDay.gif'              :1,
		'HeavySnowSwrsNight.gif'            :1,
		'IsoRainSwrsDay.gif'                :30,
		'IsoRainSwrsNight.gif'              :1,
		'IsoSleetSwrsDay.gif'               :30,
		'IsoSleetSwrsNight.gif'             :1,
		'IsoSnowSwrsDay.gif'                :30,
		'IsoSnowSwrsNight.gif'              :1,
		'ModRain.gif'                       :1,
		'ModRainSwrsDay.gif'                :30,
		'ModRainSwrsNight.gif'              :1,
		'ModSleet.gif'                      :1,
		'ModSleetSwrsDay.gif'               :30,
		'ModSleetSwrsNight.gif'             :1,
		'ModSnow.gif'                       :1,
		'ModSnowSwrsDay.gif'                :30,
		'ModSnowSwrsNight.gif'              :1,
		'OccLightRain.gif'                  :1,
		'OccLightSleet.gif'                 :1,
		'OccLightSnow.gif'                  :1,
		'Overcast.gif'                      :1,
		'PartCloudRainThunderDay.gif'       :30,
		'PartCloudRainThunderNight.gif'     :1,
		'PartCloudSleetSnowThunderDay.gif'  :40,
		'PartCloudSleetSnowThunderNight.gif':1,
		'PartlyCloudyDay.gif'               :60,
		'PartlyCloudyNight.gif'             :1,
		'Sunny.gif'                         :100
	},
	resortFieldsShort: {
		slopes_all: 's_all',
		slopes_blue: 's_blue',
		slopes_red: 's_red',
		slopes_black: 's_black',
		slopes_green: 's_green',
		slopes_number: 's_num',
		slopes_cross: 's_cross',
		artificial_snow: 'snow',
		airport_distance: 'airport',
		gastronomy_restaurants: 'rest',
		gastronomy_bars: 'bar',
		sealevel_minheight: 'alt_b',
		sealevel_maxheight: 'alt_t',
		images: 'img',
		priority: 'pri'
	},
	resortsFieldsGroups: {
		snowboard_: { //ident
			groupName: 's_park',
			snowboard_halfpipe: 1,
			snowboard_funpark: 2,
			snowboard_corner: 3,
			snowboard_wave: 4,
			snowboard_cross: 5,
			snowboard_jumps: 6,
			snowboard_slides: 7,
			snowboard_boxen: 8,
			snowboard_rides: 9
		},
		child_: {
			groupName: 'family',
			child_slope: 1,
			child_lift: 2,
			child_care: 3,
			child_carpet_lift: 4,
			child_park: 5
		},
		seg_: {
			groupName: 'seg',
			seg_family_ski: 1,
			seg_free_style: 2,
			seg_free_ride: 3,
			seg_cross_country: 4,
			seg_ski_party: 5,
			seg_romantic: 6,
			seg_ski_spa: 7
		},
		publicw_: {
			groupName: 'other',
			publicw_thermal_spa: 1
		}
		// publicw_thermal_xxx: { //custom group string for other
		// 	groupName: 'other',
		// 	publicw_thermal_xxx: 2
		// }
	}
};

module.exports = codelists;


