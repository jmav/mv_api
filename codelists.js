//Šifranti

var codelists = {
	weatherSymbolsPercentage: {//if 0 then it will mix with resorts without any forecast
		'Blizzard.gif'                      :5,
		'Clear.gif'                         :100,
		'CloudRainThunder.gif'              :15,
		'CloudSleetSnowThunder.gif'         :15,
		'Cloudy.gif'                        :40,
		'Fog.gif'                           :30,
		'Mist.gif'                          :30,
		'FreezingDrizzle.gif'               :15,
		'FreezingFog.gif'                   :30,
		'FreezingRain.gif'                  :15,
		'HeavyRain.gif'                     :15,
		'HeavyRainSwrsDay.gif'              :16,
		'HeavyRainSwrsNight.gif'            :1,
		'HeavySleet.gif'                    :15,
		'HeavySleetSwrsDay.gif'             :18,
		'HeavySleetSwrsNight.gif'           :1,
		'HeavySnow.gif'                     :14,
		'HeavySnowSwrsDay.gif'              :17,
		'HeavySnowSwrsNight.gif'            :1,
		'IsoRainSwrsDay.gif'                :26,
		'IsoRainSwrsNight.gif'              :1,
		'IsoSleetSwrsDay.gif'               :25,
		'IsoSleetSwrsNight.gif'             :1,
		'IsoSnowSwrsDay.gif'                :27,
		'IsoSnowSwrsNight.gif'              :1,
		'mist'                              :30,
		'ModRain.gif'                       :30,
		'ModRainSwrsDay.gif'                :34,
		'ModRainSwrsNight.gif'              :1,
		'ModSleet.gif'                      :30,
		'ModSleetSwrsDay.gif'               :35,
		'ModSleetSwrsNight.gif'             :1,
		'ModSnow.gif'                       :30,
		'ModSnowSwrsDay.gif'                :36,
		'ModSnowSwrsNight.gif'              :1,
		'OccLightRain.gif'                  :40,
		'OccLightSleet.gif'                 :40,
		'OccLightSnow.gif'                  :40,
		'Overcast.gif'                      :40,
		'PartCloudRainThunderDay.gif'       :60,
		'PartCloudRainThunderNight.gif'     :1,
		'PartCloudSleetSnowThunderDay.gif'  :61,
		'PartCloudSleetSnowThunderNight.gif':1,
		'PartlyCloudyDay.gif'               :70,
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


