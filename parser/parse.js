var filename = '../data/Korsika 2014-05-07.gpx';

var trackEngine = require('./modules/track_engine');

var track = new trackEngine.track();
track.open(filename, function () {
	track.filter(new Date('2014-05-13 0:00'), new Date('2014-05-13 23:00'));
	track.save('../web/data.js');
});