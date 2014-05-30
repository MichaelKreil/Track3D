
function init() {
	var zoom = 0.2;

	var body = document.getElementById('body');
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');
	var angleZ = -1;
	var angleX = -0.5;

	canvas.width  = body.offsetWidth;
	canvas.height = body.offsetHeight;

	var pressed = false;
	var changed = true;
	var drawList = false;
	var lastX, lastY;
	canvas.addEventListener('mousedown', function (e) { pd(e); mouseDown(e.screenX, e.screenY) });
	canvas.addEventListener('mousemove', function (e) { pd(e); mouseMove(e.screenX, e.screenY) });
	canvas.addEventListener('mouseup',   function (e) { pd(e); mouseUp() });
	body.addEventListener('touchstart',  function (e) { pd(e); mouseDown(e.pageX, e.pageY); });
	body.addEventListener('touchmove',   function (e) { pd(e); mouseMove(e.pageX, e.pageY); })
	body.addEventListener('touchend',    function (e) { pd(e); mouseUp() })


	function pd(event) {
		event.preventDefault();
	}
	function mouseDown(x,y) {
		pressed = true;
		lastX = x;
		lastY = y;
	}
	function mouseMove(x,y) {
		if (pressed) {
			angleZ += (lastX - x)*0.03*zoom;
			angleX += (lastY - y)*0.03*zoom;

			if (angleX >  0.0) angleX =  0.0;
			if (angleX < -1.2) angleX = -1.2;

			changed = true;

			lastX = x;
			lastY = y;
		}
	}
	function mouseUp() {
		pressed = false;
	}

	setInterval(frame, 40);

	function frame() {
		if (!changed) return;
		changed = false;

		var w  = body.offsetWidth;
		var h  = body.offsetHeight;
		canvas.width  = w;
		canvas.height = h;

		zoom = Math.sqrt(w*w + h*h)/6000;

		var xc = w / 2;
		var yc = h / 2;
		
		ctx.clearRect(0,0,w,h);

		if (!drawList) {
			drawList = [];
			for (var i = 0; i < data.points.length-1; i++) {
				var v = (data.points[i].s + data.points[i+1].s)/2;
				v *= 0.8;
				var r = Math.round(255/(Math.exp(0.1/v)-1));
				var g = Math.round(255/(Math.exp(1/v)-1));
				var b = Math.round(255/(Math.exp(2/v)-1));
				drawList.push({
					type:'path',
					z:0,
					r:1,
					alpha:1,
					point0:data.points[i  ],
					point1:data.points[i+1],
					color:r+','+g+','+b
				})
			}
			data.grid.forEach(function (point) {
				drawList.push({
					type:'grid',
					z:0,
					r:1,
					alpha:1,
					point:point,
					color: (point.z <= 0) ? '0,0,255' : '0,255,0'
				})
			})
		}

		function project(v) {
			vec.scaleZ(v, 2);
			vec.rotateZ(v, angleZ);
			vec.rotateX(v, angleX-Math.PI/2);
			vec.project(v, 3000);
			vec.scale(v, zoom);
			vec.translate2D(v, xc, yc)
			return v;
		}

		data.points.forEach(function (point) { point.vector = project([point.x, point.y, point.z]) });
		data.grid.forEach(  function (point) { point.vector = project([point.x, point.y, point.z]) });


		drawList.forEach(function (obj) {
			if (obj.point) {
				obj.z = obj.point.vector[2];
			} else {
				obj.z = (obj.point0.vector[2] + obj.point1.vector[2])/2;
			}
		})

		drawList.sort(function (a,b) {
			return a.z - b.z;
		})
		
		ctx.lineCap = 'round';

		drawList.forEach(function (obj) {
			var blur = Math.abs(obj.z)*0.03;
			
			var alpha = obj.alpha*2/Math.pow(blur+1,1.8);
			if (alpha > 1) alpha = 1;

			rad *= zoom*3;

			switch (obj.type) {
				case 'grid':
					ctx.beginPath();
					ctx.fillStyle = 'rgba('+obj.color+','+alpha+')';
					ctx.arc(obj.point.vector[0], obj.point.vector[1], (blur + obj.r)/2, 0, Math.PI*2, false);
					ctx.fill();
				break;
				case 'path':
					ctx.beginPath();
					ctx.strokeStyle = 'rgba('+obj.color+','+alpha+')';
					ctx.moveTo(obj.point0.vector[0], obj.point0.vector[1]);
					ctx.lineTo(obj.point1.vector[0], obj.point1.vector[1]);
					ctx.lineWidth = blur + obj.r;
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
	},
	translate2D: function (v, x, y) {
		v[0] += x;
		v[1] = y - v[1];
	}

}