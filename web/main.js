
function init() {
	var zoom = 0.2;

	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');
	var angleZ = 0;
	var angleX = 0;

	canvas.width  = document.getElementById('body').offsetWidth;
	canvas.height = document.getElementById('body').offsetHeight;

	var pressed = false;
	var changed = true;
	var lastX, lastY;
	canvas.addEventListener('mousedown', function (event) {
		pressed = true;
		lastX = event.screenX;
		lastY = event.screenY;
	});
	canvas.addEventListener('mouseup',   function (event) { pressed = false; });
	canvas.addEventListener('mousemove', function (event) {
		if (pressed) {
			var x = event.screenX;
			var y = event.screenY;
			angleZ += (lastX - x)*0.03*zoom;
			angleX += (lastY - y)*0.03*zoom;

			if (angleX < -1.2) angleX = -1.2;
			if (angleX >  1.2) angleX =  1.2;

			changed = true;

			lastX = x;
			lastY = y;
		}
	});

	setInterval(frame, 40);

	function frame() {
		if (!changed) return;
		changed = false;

		var w  = canvas.offsetWidth;
		var h  = canvas.offsetHeight;
		var xc = w / 2;
		var yc = h / 2;
		
		ctx.clearRect(0,0,w,h);

		var points = data.points.map(function (point) {
			var v = [point.x, point.y, point.z];
			vec.scaleZ(v, 2);
			vec.rotateZ(v, angleZ);
			vec.rotateX(v, angleX-Math.PI/2);
			vec.project(v, 3000);
			vec.scale(v, zoom);
			return [
				xc + v[0],
				yc - v[1],
				point.s,
				v[2]
			];
		});

		var objects = [];
		for (var i = 0; i < points.length-1; i++) {
			var z = (points[i][3] + points[i+1][3])/2;

			var v = (points[i][2] + points[i+1][2])/2;
			v *= 0.8;
			var r = Math.round(255/(Math.exp(0.1/v)-1));
			var g = Math.round(255/(Math.exp(1/v)-1));
			var b = Math.round(255/(Math.exp(2/v)-1));

			objects.push([z, r+','+g+','+b, 1, 1, points[i][0], points[i][1], points[i+1][0], points[i+1][1]]);
		}



		data.grid.forEach(function (point) {
			var v = [point.x, point.y, point.z];
			var color = (point.z <= 0) ? '0,0,255' : Math.round(point.z*3)+',255,0';

			vec.scaleZ(v, 2);
			vec.rotateZ(v, angleZ);
			vec.rotateX(v, angleX-Math.PI/2);
			vec.project(v, 3000);
			vec.scale(v, zoom);
			objects.push([v[2], color, 0.5, 1, xc + v[0], yc - v[1]]);
		})

		objects.sort(function (a,b) {
			return a[0]-b[0];
		})
		
		ctx.lineCap = 'round';

		objects.forEach(function (obj) {
			var rad = Math.abs(obj[0])*0.03;
			
			var alpha = 2/Math.pow(rad+1,2);
			if (alpha > 1) alpha = 1;

			switch (obj.length) {
				case 6:
					ctx.beginPath();
					ctx.fillStyle = 'rgba('+obj[1]+','+obj[2]*alpha+')';
					ctx.arc(obj[4],obj[5],obj[3]+rad,0,Math.PI*2,false);
					ctx.fill();
				break;
				case 8:
					ctx.beginPath();
					ctx.strokeStyle = 'rgba('+obj[1]+','+obj[2]*alpha+')';
					ctx.moveTo(obj[4], obj[5]);
					ctx.lineTo(obj[6], obj[7]);
					ctx.lineWidth = obj[3]+rad;
					ctx.stroke();
				break;
			}
		})

		return;


		for (var i = 0; i < points.length-1; i++) {
				//Math.abs(v[2])*0.02+1,
			var rad = (points[i][2] + points[i+1][2])/2;
			
			var alpha = 2/Math.pow(rad,1.6);
			if (alpha > 1) alpha = 1;

			var v = (points[i][3] + points[i+1][3])/2;
			v *= 0.8;
			var r = Math.round(255/(Math.exp(0.1/v)-1));
			var g = Math.round(255/(Math.exp(1/v)-1));
			var b = Math.round(255/(Math.exp(2/v)-1));

			ctx.strokeStyle = 'rgba('+r+','+g+','+b+','+alpha+')';
			//ctx.arc(x,y,rad,0,Math.PI*2,false);
			ctx.moveTo(points[i  ][0], points[i  ][1]);
			ctx.lineTo(points[i+1][0], points[i+1][1]);
			ctx.lineWidth = rad;
			ctx.stroke();
		}

		changed = false;
	}
}

var vec = {
	rotateX: function (v, ang) {
		var a = v[1], b = v[2];
		v[1] = Math.cos(ang)*a - Math.sin(ang)*b;
		v[2] = Math.sin(ang)*a + Math.cos(ang)*b;
	},
	rotateY: function (v, ang) {
		var a = v[0], b = v[2];
		v[0] = Math.cos(ang)*a - Math.sin(ang)*b;
		v[2] = Math.sin(ang)*a + Math.cos(ang)*b;
	},
	rotateZ: function (v, ang) {
		var a = v[0], b = v[1];
		v[0] = Math.cos(ang)*a - Math.sin(ang)*b;
		v[1] = Math.sin(ang)*a + Math.cos(ang)*b;
	},
	project: function (v, per) {
		v[0] *= per/(v[2]+per);
		v[1] *= per/(v[2]+per);
	},
	scale: function (v, s) {
		v[0] *= s;
		v[1] *= s;
		v[2] *= s;
	},
	scaleZ: function (v, s) {
		v[2] *= s;
	}
}