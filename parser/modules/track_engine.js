var fs = require('fs');
var xml2js = require('xml2js');

exports.track = function () {
	var me = this;

	var points = [];

	me.open = function (filename, callback) {
		new xml2js.Parser().parseString(fs.readFileSync(filename, 'utf8'), function(err, data){
			if (err) {
				console.error(err);
				process.exit();
			} else {
				data.gpx.trk.forEach(function (track) {
					track.trkseg.forEach(function (track) {
						track.trkpt.forEach(function (point) {
							points.push({
								lat: parseFloat(point.$.lat),
								lon: parseFloat(point.$.lon),
								ele: parseFloat(point.ele[0]),
								time: (new Date(point.time[0])).getTime()/1000,
								hacc: parseFloat(point.hdop[0]),
								vacc: parseFloat(point.vdop[0])
							})
						})
					});
				});
				points.sort(function (a,b) {
					return a.time - b.time;
				})
				for (var i = 0; i < points.length; i++) {
					var i0 = Math.max(i-1, 0);
					var i1 = Math.min(i+1, points.length-1);

					var f = 1/Math.cos(points[i].lat/180*Math.PI);
					var dy = (points[i0].lat - points[i1].lat)*40074000/360;
					var dx = (points[i0].lon - points[i1].lon)*40074000/360*f;
					var s = Math.sqrt(dx*dx + dy*dy);
					var t = Math.abs(points[i0].time - points[i1].time);
					points[i].v = s/t;
				}
				callback();
			}
		});
	};

	me.filter = function (minTime, maxTime) {
		minTime = minTime.getTime()/1000;
		maxTime = maxTime.getTime()/1000;
		points = points.filter(function (point) {
			if (point.time < minTime) return false;
			if (point.time > maxTime) return false;
			return true;
		})
	}

	me.save = function (filename) {
		var latMin =  1e10;
		var latMax = -1e10;
		var lonMin =  1e10;
		var lonMax = -1e10;
		var timeMin = points[0].time;
		points.forEach(function (point) {
			if (latMin > point.lat) latMin = point.lat;
			if (latMax < point.lat) latMax = point.lat;
			if (lonMin > point.lon) lonMin = point.lon;
			if (lonMax < point.lon) lonMax = point.lon;
		})

		var latC = (latMin + latMax)/2;
		var lonC = (lonMin + lonMax)/2;
		var f = 1/Math.cos(latC/180*Math.PI);

		
		var area = sqr(latMax-latMin) + sqr((lonMax-lonMin)*f);
		var r = 0.05*Math.sqrt(area);
		latMin -= r;
		latMax += r;
		lonMin -= r/f;
		lonMax += r/f;
		var latValues = [], lonValues = [];
		var stepY = Math.sqrt(area)/100, stepX = stepY/f;
		var xc = Math.floor((lonMax-lonMin)/(2*stepX));
		var yc = Math.floor((latMax-latMin)/(2*stepY));
		for (var x = -xc; x <= xc; x++) lonValues.push(x*stepX + lonC);
		for (var y = -yc; y <= yc; y++) latValues.push(y*stepY + latC);
		var grid = [];
		var elevation = new Elevation();
		lonValues.forEach(function (lon) {
			latValues.forEach(function (lat) {
				grid.push({lon:lon, lat:lat, ele:elevation(lon, lat)});
			})
		})

		var data = {
			points: points.map(function (point) {
				return {
					y:-round((point.lat - latC)*40074000/360),
					x: round((point.lon - lonC)*40074000/360*f),
					z: point.ele,
					t: point.time - timeMin,
					h: point.hacc,
					v: point.vacc,
					s: point.v
				}
			}),
			grid: grid.map(function (point) {
				return {
					y:-round((point.lat - latC)*40074000/360),
					x: round((point.lon - lonC)*40074000/360*f),
					z: point.ele
				}
			})
		}

		data = JSON.stringify(data);
		data = data.replace(/\"/g, '');
		data = 'var data = '+data+';';

		fs.writeFileSync(filename, data, 'utf8');

		function round (value) {
			return Math.round(value*1000)/1000;
		}
	}

	return me;
}

function Elevation() {
	var tiles = {};

	function getTile(name) {
		if (tiles[name]) return tiles[name];
		var file = '../data/ASTGTM2/'+name.substr(0,11)+'/'+name+'/'+name+'_dem.tif';
		if (!fs.existsSync(file)) console.error('File not found "'+file+'"');
		var buffer = fs.readFileSync(file);
		buffer = buffer.slice(8, 3601*3601*2+8);
		tiles[name] = buffer;
		return buffer;
	}

	return function (lon, lat) {
		var lon0 = Math.floor(lon);
		var lat0 = Math.floor(lat);
		var xs = (lon0 < 0 ? 'W' : 'E') + (Math.abs(lon0)+1000).toFixed().substr(1);
		var ys = (lat0 < 0 ? 'S' : 'N') + (Math.abs(lat0)+1000).toFixed().substr(2);
		
		var tile = 'ASTGTM2_'+ys+xs;
		tile = getTile(tile);
		var x = Math.round((  lon-lon0)*3600);
		var y = Math.round((1-lat+lat0)*3600);
		var ele = tile.readInt16LE(((y*3601)+x)*2);

		return ele;
	}
}

function sqr(x) {
	return x*x;
}
