/*
	Gallery page hero: optimal transport between pictures
	-----------------------------------------------------
	A cloud of particles forms a picture (a camera, a star, a heart, the lab's
	name) and then flows into the next one. Each particle is matched to a target
	point by a transport plan and moves along a straight line between them
	(McCann's displacement interpolation), so the whole cloud travels the
	cheapest way it can.

	The plan is a greedy approximation of the optimal one. Optimal transport is the theory behind the derivation of the feedback particle
	filter, which is why it appears here. Uses the shared banner CSS (.fpf-hero).
*/

(function () {
	'use strict';

	var canvas = document.getElementById('ot-canvas');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	var hero = canvas.parentElement;
	var btnNext = document.getElementById('ot-next');
	var btnPause = document.getElementById('ot-pause');
	var label = document.getElementById('ot-label');
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var N = 650;
	var SHAPES = ['camera', 'star', 'heart', 'text'];
	var NAMES = { camera: 'a camera', star: 'a star', heart: 'a heart', text: 'the lab' };
	var shapeIdx = 0;
	var from = [], to = [], cur = [];
	var t = 1, travel = 2.2, dwell = 2.6, hold = 0;
	var running = !reduceMotion, visible = true, last = 0;
	var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, sz = 1, boxW = 0, boxH = 0;

	// --- Sample points uniformly from a filled shape ----------------------------
	function sampleShape(name) {
		var s = 220, off = document.createElement('canvas');
		off.width = s * 2; off.height = s;
		var g = off.getContext('2d');
		g.fillStyle = '#fff';
		g.strokeStyle = '#fff';
		g.lineJoin = 'round';

		if (name === 'camera') {
			rr(g, 115, 55, 210, 140, 22); g.fill();
			rr(g, 165, 30, 70, 34, 8); g.fill();
			g.globalCompositeOperation = 'destination-out';
			g.beginPath(); g.arc(220, 125, 48, 0, 2 * Math.PI); g.fill();
			g.globalCompositeOperation = 'source-over';
			g.beginPath(); g.arc(220, 125, 30, 0, 2 * Math.PI); g.fill();
			g.beginPath(); g.arc(295, 80, 9, 0, 2 * Math.PI); g.fill();
		} else if (name === 'star') {
			g.beginPath();
			for (var k = 0; k < 10; k++) {
				var r = k % 2 ? 42 : 100, a = -Math.PI / 2 + k * Math.PI / 5;
				g.lineTo(220 + r * Math.cos(a), 112 + r * Math.sin(a));
			}
			g.closePath(); g.fill();
		} else if (name === 'heart') {
			g.beginPath();
			g.moveTo(220, 200);
			g.bezierCurveTo(70, 110, 120, 10, 220, 70);
			g.bezierCurveTo(320, 10, 370, 110, 220, 200);
			g.fill();
		} else {
			g.font = '900 120px "Source Sans 3", "Helvetica Neue", Arial, sans-serif';
			g.textAlign = 'center';
			g.textBaseline = 'middle';
			g.fillText('MEHTA', 220, 116);
		}

		var data = g.getImageData(0, 0, off.width, off.height).data, pts = [];
		for (var y = 0; y < off.height; y += 2) {
			for (var x = 0; x < off.width; x += 2) {
				if (data[(y * off.width + x) * 4 + 3] > 128) pts.push([(x - 220) / 110, (y - 112) / 110]);
			}
		}
		var out = [];
		for (var i = 0; i < N; i++) {
			var p = pts[Math.floor(Math.random() * pts.length)];
			out.push([p[0] + (Math.random() - 0.5) * 0.02, p[1] + (Math.random() - 0.5) * 0.02]);
		}
		return out;
	}

	function rr(g, x, y, w, h, r) {
		g.beginPath();
		g.moveTo(x + r, y);
		g.arcTo(x + w, y, x + w, y + h, r);
		g.arcTo(x + w, y + h, x, y + h, r);
		g.arcTo(x, y + h, x, y, r);
		g.arcTo(x, y, x + w, y, r);
		g.closePath();
	}

	// Transport plan: pair each particle with a target point so the total
	// distance travelled is small. Greedy matching (each particle, in random
	// order, takes the nearest target still free) is a quick, good-looking
	// approximation to the optimal plan for a cloud this size.
	function plan(src, dst) {
		var n = src.length, used = new Uint8Array(n), out = new Array(n);
		var order = src.map(function (_, i) { return i; });
		for (var i = n - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
		order.forEach(function (i) {
			var best = -1, bd = Infinity, sx = src[i][0], sy = src[i][1];
			for (var k = 0; k < n; k++) {
				if (used[k]) continue;
				var dx = dst[k][0] - sx, dy = dst[k][1] - sy, d = dx * dx + dy * dy;
				if (d < bd) { bd = d; best = k; }
			}
			used[best] = 1;
			out[i] = dst[best];
		});
		return out;
	}

	function next() {
		shapeIdx = (shapeIdx + 1) % SHAPES.length;
		from = cur.map(function (p) { return p.slice(); });
		to = plan(from, sampleShape(SHAPES[shapeIdx]));
		t = 0; hold = 0;
		if (label) label.textContent = NAMES[SHAPES[shapeIdx]];
	}

	function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = hero.clientWidth;
		H = hero.clientHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		var wide = W > 736;
		boxW = wide ? Math.min(W * 0.62, 860) : W * 0.88;
		boxH = wide ? H * 0.46 : H * 0.4;
		cx = W / 2;
		cy = H * 0.52;
		sz = Math.min(boxH * 0.42, boxW * 0.2);
		draw();
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);
		ctx.strokeStyle = 'rgba(255,255,255,0.14)';
		ctx.lineWidth = 1;
		rr(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, Math.min(48, boxH * 0.3));
		ctx.stroke();

		var u = ease(Math.min(1, t));
		var moving = t < 1;
		for (var i = 0; i < N; i++) {
			var a = from[i] || cur[i], b = to[i] || cur[i];
			var x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
			cur[i] = [x, y];
			var px = cx + x * sz, py = cy + y * sz;
			// a few particles in orange, so individual journeys can be followed
			ctx.fillStyle = i % 37 === 0 ? '#FF5F05' : (moving ? 'rgba(156,195,245,0.85)' : 'rgba(201,222,250,0.95)');
			ctx.fillRect(px - 1.3, py - 1.3, i % 37 === 0 ? 3.4 : 2.6, i % 37 === 0 ? 3.4 : 2.6);
		}
	}

	function frame(now) {
		var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
		last = now;
		if (running && visible) {
			if (t < 1) t += dt / travel;
			else { hold += dt; if (hold > dwell) next(); }
			draw();
		}
		requestAnimationFrame(frame);
	}

	if (btnNext) btnNext.addEventListener('click', function () {
		next();
		if (reduceMotion) { t = 1; draw(); }
	});
	canvas.addEventListener('click', function () { if (t >= 1) { next(); if (reduceMotion) { t = 1; draw(); } } });

	if (btnPause) {
		if (reduceMotion) btnPause.hidden = true;
		btnPause.addEventListener('click', function () {
			running = !running;
			btnPause.textContent = running ? 'Pause' : 'Play';
			btnPause.setAttribute('aria-pressed', String(!running));
		});
	}

	if ('IntersectionObserver' in window) {
		new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
	}
	window.addEventListener('resize', resize);

	// start as a scattered cloud that gathers into the first picture
	for (var i = 0; i < N; i++) cur.push([(Math.random() * 2 - 1) * 3, (Math.random() * 2 - 1) * 1.2]);
	resize();
	shapeIdx = -1;
	next();
	if (reduceMotion) { t = 1; draw(); }
	else requestAnimationFrame(frame);
})();
