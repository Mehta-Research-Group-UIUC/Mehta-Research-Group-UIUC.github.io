/*
	Feedback particle filter hero — Mehta Research Group
	-----------------------------------------------------
	A real (small) FPF running in the browser, not a decorative animation.

	Hidden state   X_t in R^2, travelling round a rounded rectangle (a superellipse
	               |x/A|^p + |y/B|^p = 1) at constant speed, with noise:
	               dX = a(X) dt + sigma dB
	               a(x) = v * (unit tangent) - k * F(x) * (unit normal),  F = |x/A|^p + |y/B|^p - 1
	Observation    only the horizontal position, corrupted by noise:
	               dZ = h(X) dt + sigma_w dW,  h(x) = x_1
	Filter         N particles, each updated with the FPF control law
	               dX^i = a(X^i) dt + sigma dB^i + K ( dZ - (h(X^i) + h_hat)/2 dt )
	               using the constant-gain approximation
	               K = E[(X - mean)(h(X) - h_hat)] / sigma_w^2.

	Click the canvas to move the hidden state; the particles re-acquire it.
	Respects prefers-reduced-motion (draws one still frame instead).
*/

(function () {
	'use strict';

	var canvas = document.getElementById('fpf-canvas');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	var hero = canvas.parentElement;
	var btnScatter = document.getElementById('fpf-scatter');
	var btnPause = document.getElementById('fpf-pause');
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// --- Model parameters ---------------------------------------------------
	var N = 260;               // particles
	var dt = 0.01;             // integration step (s)
	var stepsPerFrame = 2;
	var A = 2.4, B = 1;        // half-width and half-height of the path (state units)
	var P = 6;                 // superellipse exponent: higher = squarer corners
	var speed = 1.7;           // travel speed along the path (one lap is about 8 s)
	var kappa = 2;             // how strongly the path attracts
	var sigma = 0.12;          // process noise
	var sigmaW = 0.35;         // measurement noise

	// --- Colours (match mehta.css tokens) -----------------------------------
	var BG = '19, 41, 75';     // Illini blue as rgb
	var PARTICLE = 'rgba(156, 195, 245, 0.85)';
	var ORANGE = '#FF5F05';

	// --- State --------------------------------------------------------------
	var truth = [2.4, 0];
	var px = new Float64Array(N), py = new Float64Array(N);
	var trail = [];            // recent true positions
	var ticks = [];            // recent noisy observations (x only)
	var running = !reduceMotion;
	var visible = true;
	var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 1;

	function randn() {
		var u = 0, v = 0;
		while (u === 0) u = Math.random();
		while (v === 0) v = Math.random();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}

	function drift(x, y, out) {
		var ax = Math.abs(x) / A, ay = Math.abs(y) / B;
		var F = Math.pow(ax, P) + Math.pow(ay, P) - 1;
		F = Math.max(-1, Math.min(2, F));                    // keep far-away points stable
		var gx = P / A * Math.pow(ax, P - 1) * (x < 0 ? -1 : 1);
		var gy = P / B * Math.pow(ay, P - 1) * (y < 0 ? -1 : 1);
		var n = Math.sqrt(gx * gx + gy * gy) + 1e-6;
		out[0] = speed * (-gy / n) - kappa * F * gx / n;     // along the path, anticlockwise
		out[1] = speed * ( gx / n) - kappa * F * gy / n;     // plus a pull back onto it
	}

	// Point on the path at angle t, for drawing the guide
	function pathPoint(t) {
		var c = Math.cos(t), s = Math.sin(t);
		return [A * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / P),
		        B * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 2 / P)];
	}

	function scatter() {
		// Wide, uninformative prior: particles fill the whole box and a little beyond
		for (var i = 0; i < N; i++) {
			px[i] = (Math.random() * 2 - 1) * A * 1.1;
			py[i] = (Math.random() * 2 - 1) * B * 1.25;
		}
	}

	var a = [0, 0];
	var sq = Math.sqrt(dt);

	function step() {
		// 1. Hidden state
		drift(truth[0], truth[1], a);
		truth[0] += a[0] * dt + sigma * sq * randn();
		truth[1] += a[1] * dt + sigma * sq * randn();

		// 2. Observation increment, h(x) = x_1
		var dZ = truth[0] * dt + sigmaW * sq * randn();

		// 3. Empirical statistics for the constant gain
		var mx = 0, my = 0, hHat = 0, i;
		for (i = 0; i < N; i++) { mx += px[i]; my += py[i]; }
		mx /= N; my /= N; hHat = mx;               // since h(x) = x_1
		var cxh = 0, cyh = 0;
		for (i = 0; i < N; i++) {
			var dh = px[i] - hHat;
			cxh += (px[i] - mx) * dh;
			cyh += (py[i] - my) * dh;
		}
		var Kx = cxh / N / (sigmaW * sigmaW);
		var Ky = cyh / N / (sigmaW * sigmaW);

		// 4. FPF update for every particle
		for (i = 0; i < N; i++) {
			drift(px[i], py[i], a);
			var innov = dZ - 0.5 * (px[i] + hHat) * dt;
			px[i] += a[0] * dt + sigma * sq * randn() + Kx * innov;
			py[i] += a[1] * dt + sigma * sq * randn() + Ky * innov;
		}

		// Keep a short record for drawing
		trail.push([truth[0], truth[1]]);
		if (trail.length > 140) trail.shift();
		ticks.push(dZ / dt * 0.12 + truth[0] * 0.88);   // lightly smoothed noisy reading, for display only
		if (ticks.length > 22) ticks.shift();
	}

	// --- Layout -------------------------------------------------------------
	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = hero.clientWidth;
		H = hero.clientHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// The box is wide on desktop and squarer on phones so the phrase can wrap
		var wide = W > 736;
		A = wide ? 2.4 : 1.35;
		S = wide ? Math.min(W * 0.36 / A, H * 0.22 / B) : Math.min(W * 0.42 / A, H * 0.26 / B);
		cx = W * 0.5;
		cy = H * 0.46;
		// Tell the CSS the box size so the phrase always fits inside it
		hero.style.setProperty('--box-w', (2 * A * S) + 'px');
		hero.style.setProperty('--box-h', (2 * B * S) + 'px');

		ctx.clearRect(0, 0, W, H);   // canvas is transparent: the banner's photo shows through
		draw(true);
	}

	function toScreen(x, y) { return [cx + S * x, cy - S * y]; }

	// --- Drawing ------------------------------------------------------------
	function draw(fresh) {
		// Motion trails on a transparent canvas: fade what was drawn before,
		// so the background photo (set in mehta.css) stays visible underneath
		if (fresh) {
			ctx.clearRect(0, 0, W, H);
		} else {
			ctx.globalCompositeOperation = 'destination-out';
			ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
			ctx.fillRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'source-over';
		}

		// Path guide: the rounded rectangle the hidden state travels round
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (var g = 0; g <= 200; g++) {
			var q = pathPoint(2 * Math.PI * g / 200), sq2 = toScreen(q[0], q[1]);
			if (g === 0) ctx.moveTo(sq2[0], sq2[1]); else ctx.lineTo(sq2[0], sq2[1]);
		}
		ctx.stroke();

		// Observation axis: we only ever see the horizontal coordinate
		var baseY = cy + S * B * 1.45, half = A * 1.1;
		ctx.strokeStyle = 'rgba(255,255,255,0.12)';
		ctx.beginPath();
		ctx.moveTo(cx - S * half, baseY);
		ctx.lineTo(cx + S * half, baseY);
		ctx.stroke();

		for (var k = 0; k < ticks.length; k++) {
			var tx = cx + S * Math.max(-half, Math.min(half, ticks[k]));
			ctx.strokeStyle = 'rgba(255,95,5,' + (0.15 + 0.6 * k / ticks.length) + ')';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(tx, baseY - 7);
			ctx.lineTo(tx, baseY + 7);
			ctx.stroke();
		}

		// Particles
		ctx.fillStyle = PARTICLE;
		for (var i = 0; i < N; i++) {
			var p = toScreen(px[i], py[i]);
			ctx.fillRect(p[0] - 1.2, p[1] - 1.2, 2.4, 2.4);
		}

		// True (hidden) state with a short wake
		if (trail.length > 1) {
			ctx.strokeStyle = 'rgba(255,95,5,0.35)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			var s0 = toScreen(trail[0][0], trail[0][1]);
			ctx.moveTo(s0[0], s0[1]);
			for (var j = 1; j < trail.length; j++) {
				var s = toScreen(trail[j][0], trail[j][1]);
				ctx.lineTo(s[0], s[1]);
			}
			ctx.stroke();
		}
		var t = toScreen(truth[0], truth[1]);
		ctx.strokeStyle = ORANGE;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(t[0], t[1], 7, 0, 2 * Math.PI);
		ctx.stroke();
	}

	// --- Loop ---------------------------------------------------------------
	function frame() {
		if (running && visible) {
			for (var k = 0; k < stepsPerFrame; k++) step();
			draw(false);
		}
		requestAnimationFrame(frame);
	}

	function stillFrame() {
		// For reduced motion: advance silently, then draw one composed frame
		scatter();
		trail = []; ticks = [];
		for (var k = 0; k < 90; k++) step();
		draw(true);
	}

	// --- Interaction ----------------------------------------------------------
	canvas.addEventListener('click', function (e) {
		var r = canvas.getBoundingClientRect();
		var x = (e.clientX - r.left - cx) / S;
		var y = -(e.clientY - r.top - cy) / S;
		if (Math.abs(x) > A * 1.4 || Math.abs(y) > B * 1.6) return;   // ignore clicks far from the box
		truth[0] = x; truth[1] = y;
		trail = [];
		if (reduceMotion) { for (var k = 0; k < 90; k++) step(); draw(true); }
	});

	if (btnScatter) btnScatter.addEventListener('click', function () {
		if (reduceMotion) { stillFrame(); return; }
		scatter();
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
		new IntersectionObserver(function (entries) {
			visible = entries[0].isIntersecting;
		}).observe(hero);
	}

	window.addEventListener('resize', resize);

	// --- Go -----------------------------------------------------------------
	scatter();
	resize();
	if (reduceMotion) stillFrame();
	else requestAnimationFrame(frame);
})();