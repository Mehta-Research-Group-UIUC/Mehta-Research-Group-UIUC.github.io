/*
	Awards page hero: a particle swarm finding the highest peak
	-----------------------------------------------------------
	A hilly landscape f(x, y) with several peaks is drawn inside the rounded box.
	A swarm of particles searches for the highest one using consensus-based
	optimization, an interacting particle method for global optimization:

	    m      = sum_j x_j exp(a f(x_j)) / sum_j exp(a f(x_j))    (weighted consensus)
	    dx_i   = -lambda (x_i - m) dt + sigma |x_i - m| dB_i

	Particles are pulled toward the consensus, which leans toward whoever stands
	highest, and explore with noise that fades as they agree. Nobody computes a gradient.

	The group's alumni have worked on controlled particle systems for exactly this
	problem (global optimization). Uses the same banner CSS as the other pages.
*/

(function () {
	'use strict';

	var canvas = document.getElementById('peak-canvas');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	var hero = canvas.parentElement;
	var btnNew = document.getElementById('peak-new');
	var btnPause = document.getElementById('peak-pause');
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var N = 140, dt = 0.02, lambda = 1, sigma = 1.4, alpha = 50;   // tuned so the swarm finds the true top every time in testing
	var A = 2.4, B = 1, P = 6;                 // box shape, same as the other pages
	var px = new Float64Array(N), py = new Float64Array(N);
	var bumps = [], best = [0, 0];
	var time = 0, settled = 0, mx = 0, my = 0;
	var running = !reduceMotion, visible = true;
	var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 1;
	var field = document.createElement('canvas'), fctx = field.getContext('2d');

	function randn() {
		var u = 0, v = 0;
		while (u === 0) u = Math.random();
		while (v === 0) v = Math.random();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}

	// A landscape of Gaussian hills: one tallest, several decoys
	function newLandscape() {
		bumps = [];
		var n = 7;
		for (var i = 0; i < n; i++) {
			bumps.push({
				x: (Math.random() * 2 - 1) * A * 0.85,
				y: (Math.random() * 2 - 1) * B * 0.75,
				h: i === 0 ? 1 : 0.45 + Math.random() * 0.35,   // decoys reach 45-80% of the summit
				s: 0.28 + Math.random() * 0.3
			});
		}
		// locate the true maximum on a fine grid (for the star marker)
		var bv = -1;
		for (var gx = -A; gx <= A; gx += A / 120) {
			for (var gy = -B; gy <= B; gy += B / 50) {
				var v = f(gx, gy);
				if (v > bv) { bv = v; best = [gx, gy]; }
			}
		}
		paintField();
		scatter();
	}

	function f(x, y) {
		var v = 0;
		for (var i = 0; i < bumps.length; i++) {
			var b = bumps[i], dx = x - b.x, dy = y - b.y;
			v += b.h * Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s));
		}
		return v;
	}

	function scatter() {
		for (var i = 0; i < N; i++) {
			px[i] = (Math.random() * 2 - 1) * A * 0.95;
			py[i] = (Math.random() * 2 - 1) * B * 0.9;
		}
		time = 0; settled = 0;
	}

	// The landscape: a soft glow plus contour lines, rendered once per landscape
	// into an offscreen canvas at display size (redrawn on resize)
	function paintField() {
		if (!S || !W) return;
		var w = Math.max(2, Math.round(2 * S * A * dpr)), h = Math.max(2, Math.round(2 * S * B * dpr));
		field.width = w; field.height = h;

		// glow from a coarse grid, smoothed by drawing it scaled up
		var gw = 96, gh = Math.max(2, Math.round(96 * B / A));
		var glow = document.createElement('canvas'), g = glow.getContext('2d');
		glow.width = gw; glow.height = gh;
		var img = g.createImageData(gw, gh), d = img.data, vals = [];
		for (var j = 0; j < gh; j++) {
			vals.push([]);
			for (var i = 0; i < gw; i++) {
				var x = (i / (gw - 1) * 2 - 1) * A, y = -(j / (gh - 1) * 2 - 1) * B;
				var v = Math.min(1, f(x, y)), k = (j * gw + i) * 4;
				vals[j].push(v);
				d[k] = 156; d[k + 1] = 195; d[k + 2] = 245;
				d[k + 3] = Math.round(255 * 0.42 * Math.pow(v, 1.4));
			}
		}
		g.putImageData(img, 0, 0);
		fctx.imageSmoothingEnabled = true;
		fctx.drawImage(glow, 0, 0, w, h);

		// contour lines by marching squares
		var sx = w / (gw - 1), sy = h / (gh - 1);
		fctx.strokeStyle = 'rgba(201, 222, 250, 0.35)';
		fctx.lineWidth = dpr;
		[0.2, 0.35, 0.5, 0.65, 0.8, 0.92].forEach(function (lv) {
			fctx.beginPath();
			for (var j = 0; j < gh - 1; j++) {
				for (var i = 0; i < gw - 1; i++) {
					var a0 = vals[j][i], a1 = vals[j][i + 1], a2 = vals[j + 1][i + 1], a3 = vals[j + 1][i];
					var pts = [];
					function edge(va, vb, xa, ya, xb, yb) {
						if ((va < lv) !== (vb < lv)) { var t = (lv - va) / (vb - va); pts.push([xa + t * (xb - xa), ya + t * (yb - ya)]); }
					}
					edge(a0, a1, i, j, i + 1, j);
					edge(a1, a2, i + 1, j, i + 1, j + 1);
					edge(a2, a3, i + 1, j + 1, i, j + 1);
					edge(a3, a0, i, j + 1, i, j);
					for (var q = 0; q + 1 < pts.length; q += 2) {
						fctx.moveTo(pts[q][0] * sx, pts[q][1] * sy);
						fctx.lineTo(pts[q + 1][0] * sx, pts[q + 1][1] * sy);
					}
				}
			}
			fctx.stroke();
		});
	}

	function step() {
		// weighted consensus, with weights exp(alpha * f) (shifted for numerical safety)
		var fmax = -Infinity, i, fv = new Float64Array(N);
		for (i = 0; i < N; i++) { fv[i] = f(px[i], py[i]); if (fv[i] > fmax) fmax = fv[i]; }
		var ws = 0; mx = 0; my = 0;
		for (i = 0; i < N; i++) {
			var w = Math.exp(alpha * (fv[i] - fmax));
			ws += w; mx += w * px[i]; my += w * py[i];
		}
		mx /= ws; my /= ws;

		var sq = Math.sqrt(dt), spread = 0;
		for (i = 0; i < N; i++) {
			var dx = px[i] - mx, dy = py[i] - my;
			px[i] += -lambda * dx * dt + sigma * Math.abs(dx) * sq * randn();
			py[i] += -lambda * dy * dt + sigma * Math.abs(dy) * sq * randn();
			px[i] = Math.max(-A, Math.min(A, px[i]));
			py[i] = Math.max(-B, Math.min(B, py[i]));
			spread += dx * dx + dy * dy;
		}
		time += dt;

		// once the swarm has agreed for a while, start a fresh search
		if (Math.sqrt(spread / N) < 0.03) settled += dt; else settled = 0;
		if (settled > 3.5 && !reduceMotion) newLandscape();
	}

	// --- Drawing --------------------------------------------------------------------
	function boxPath() {
		ctx.beginPath();
		for (var g = 0; g <= 200; g++) {
			var t = 2 * Math.PI * g / 200, c = Math.cos(t), s = Math.sin(t);
			var x = cx + S * A * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / P);
			var y = cy - S * B * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 2 / P);
			if (g === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
		}
		ctx.closePath();
	}

	function toScreen(x, y) { return [cx + S * x, cy - S * y]; }

	function draw() {
		ctx.clearRect(0, 0, W, H);

		// landscape, clipped to the box
		ctx.save();
		boxPath();
		ctx.clip();
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(field, cx - S * A, cy - S * B, 2 * S * A, 2 * S * B);
		ctx.restore();

		ctx.strokeStyle = 'rgba(255,255,255,0.14)';
		ctx.lineWidth = 1;
		boxPath();
		ctx.stroke();

		// the true summit: a small star
		var b = toScreen(best[0], best[1]);
		star(b[0], b[1], 7, 3, 'rgba(255,255,255,0.85)');

		// particles (clipped to the box, so none appear to float outside it)
		ctx.save();
		boxPath();
		ctx.clip();
		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		for (var i = 0; i < N; i++) {
			var p = toScreen(px[i], py[i]);
			ctx.beginPath();
			ctx.arc(p[0], p[1], 2.4, 0, 2 * Math.PI);
			ctx.fill();
		}
		ctx.restore();

		// consensus: where the swarm currently thinks the top is
		var m = toScreen(mx, my);
		ctx.strokeStyle = '#FF5F05';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(m[0], m[1], 9, 0, 2 * Math.PI);
		ctx.stroke();
	}

	function star(x, y, R, r, color) {
		ctx.fillStyle = color;
		ctx.beginPath();
		for (var k = 0; k < 10; k++) {
			var rad = k % 2 ? r : R, a = -Math.PI / 2 + k * Math.PI / 5;
			ctx.lineTo(x + rad * Math.cos(a), y + rad * Math.sin(a));
		}
		ctx.closePath();
		ctx.fill();
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = hero.clientWidth;
		H = hero.clientHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		var wide = W > 736;
		var newA = wide ? 2.4 : 1.35;
		if (newA !== A) { A = newA; newLandscape(); }
		S = wide ? Math.min(W * 0.36 / A, H * 0.25 / B) : Math.min(W * 0.44 / A, H * 0.24 / B);
		cx = W * 0.5;
		cy = H * 0.54;                 // leaves room for the page title above the box
		hero.style.setProperty('--box-w', (2 * A * S) + 'px');
		paintField();
		draw();
	}

	function frame() {
		if (running && visible) { step(); draw(); }   // one step per frame so the search is visible
		requestAnimationFrame(frame);
	}

	function stillFrame() {
		for (var k = 0; k < 220; k++) step();
		draw();
	}

	// --- Controls ---------------------------------------------------------------------
	if (btnNew) btnNew.addEventListener('click', function () {
		newLandscape();
		if (reduceMotion) stillFrame(); else draw();
	});

	canvas.addEventListener('click', function () {
		scatter();
		if (reduceMotion) stillFrame();
	});

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

	newLandscape();
	resize();
	if (reduceMotion) stillFrame();
	else requestAnimationFrame(frame);
})();
