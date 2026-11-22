/*
	Team page hero: coupled oscillators falling into step
	-----------------------------------------------------
	A live Kuramoto model, the classic model of synchronisation, which the group
	has studied as a game ("synchronisation of coupled oscillators is a game").

	N oscillators, each with its own natural frequency w_i, move round the same
	rounded rectangle used on the home page. Each one is pulled toward the
	group's average rhythm:

	    d(theta_i) = [ w_i + K r sin(psi - theta_i) ] dt + sigma dB_i
	    r e^{i psi} = (1/N) sum_j e^{i theta_j}     (r = 0: chaos, r = 1: in step)

	Below a critical coupling K_c (about 0.8 here) they never agree.
	Above it, a crowd forms. The slider lets visitors find the threshold.

	Uses the same markup and CSS as the home page hero (.fpf-hero).
	Respects prefers-reduced-motion.
*/

(function () {
	'use strict';

	var canvas = document.getElementById('sync-canvas');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	var hero = canvas.parentElement;
	var btnScatter = document.getElementById('sync-scatter');
	var btnPause = document.getElementById('sync-pause');
	var slider = document.getElementById('sync-k');
	var kOut = document.getElementById('sync-k-value');
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// --- Model ----------------------------------------------------------------
	var N = 70;
	var dt = 0.01, stepsPerFrame = 2;
	var w0 = 2 * Math.PI / 9;          // average rhythm: one lap in about 9 s
	var spread = 0.5;                  // spread of natural frequencies (rad/s)
	var K = 1.6;                       // coupling strength (slider)
	var sigma = 0.05;                  // small noise so it never freezes completely

	var theta = new Float64Array(N), w = new Float64Array(N);
	var r = 0, psi = 0;
	var A = 2.4, B = 1, P = 6;         // rounded-rectangle path, same shape as the home page
	var running = !reduceMotion, visible = true;
	var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 1;

	function randn() {
		var u = 0, v = 0;
		while (u === 0) u = Math.random();
		while (v === 0) v = Math.random();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}

	function init() {
		for (var i = 0; i < N; i++) w[i] = w0 + spread * randn();
		scatter();
	}

	function scatter() {
		for (var i = 0; i < N; i++) theta[i] = 2 * Math.PI * Math.random();
	}

	function order() {
		var c = 0, s = 0;
		for (var i = 0; i < N; i++) { c += Math.cos(theta[i]); s += Math.sin(theta[i]); }
		c /= N; s /= N;
		r = Math.sqrt(c * c + s * s);
		psi = Math.atan2(s, c);
	}

	function step() {
		order();
		var sq = Math.sqrt(dt);
		for (var i = 0; i < N; i++) {
			theta[i] += (w[i] + K * r * Math.sin(psi - theta[i])) * dt + sigma * sq * randn();
		}
	}

	// --- Geometry ---------------------------------------------------------------
	function pathPoint(t) {
		var c = Math.cos(t), s = Math.sin(t);
		return [cx + S * A * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / P),
		        cy - S * B * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 2 / P)];
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = hero.clientWidth;
		H = hero.clientHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		var wide = W > 736;
		A = wide ? 2.4 : 1.35;
		S = wide ? Math.min(W * 0.36 / A, H * 0.24 / B) : Math.min(W * 0.42 / A, H * 0.26 / B);
		cx = W * 0.5;
		cy = H * (wide ? 0.44 : 0.4);
		hero.style.setProperty('--box-w', (2 * A * S) + 'px');
		hero.style.setProperty('--box-h', (2 * B * S) + 'px');
		draw(true);
	}

	// --- Drawing ----------------------------------------------------------------
	function draw(fresh) {
		if (fresh) {
			ctx.clearRect(0, 0, W, H);
		} else {
			ctx.globalCompositeOperation = 'destination-out';     // fade old trails, keep the photo visible
			ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
			ctx.fillRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'source-over';
		}

		// Path guide
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (var g = 0; g <= 200; g++) {
			var q = pathPoint(2 * Math.PI * g / 200);
			if (g === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
		}
		ctx.stroke();

		// Oscillators (team members)
		ctx.fillStyle = 'rgba(156, 195, 245, 0.9)';
		for (var i = 0; i < N; i++) {
			var p = pathPoint(theta[i]);
			ctx.beginPath();
			ctx.arc(p[0], p[1], 3.2, 0, 2 * Math.PI);
			ctx.fill();
		}

		// The group's shared rhythm: orange ring, bigger when the group agrees
		order();
		var m = pathPoint(psi);
		ctx.strokeStyle = 'rgba(255, 95, 5,' + (0.35 + 0.65 * r) + ')';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(m[0], m[1], 6 + 10 * r, 0, 2 * Math.PI);
		ctx.stroke();

		// Synchrony meter under the box: r from 0 to 1
		var y = cy + S * B * 1.45, x0 = cx - S * A, len = 2 * S * A;
		ctx.fillStyle = 'rgba(255,255,255,0.12)';
		ctx.fillRect(x0, y - 2, len, 4);
		ctx.fillStyle = '#FF5F05';
		ctx.fillRect(x0, y - 2, len * r, 4);
		ctx.clearRect(x0, y + 6, 220, 22);      // wipe the old label so numbers don't smear in the trails
		ctx.fillStyle = 'rgba(201, 212, 227, 0.9)';
		ctx.font = '600 13px "Source Sans 3", "Helvetica Neue", Arial, sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText('synchrony  r = ' + r.toFixed(2), x0, y + 22);
	}

	// --- Loop -------------------------------------------------------------------
	function frame() {
		if (running && visible) {
			for (var k = 0; k < stepsPerFrame; k++) step();
			draw(false);
		}
		requestAnimationFrame(frame);
	}

	function stillFrame() {
		for (var k = 0; k < 900; k++) step();   // let the crowd form, then draw once
		draw(true);
	}

	// --- Interaction --------------------------------------------------------------
	canvas.addEventListener('click', function () {
		scatter();
		if (reduceMotion) stillFrame();
	});

	if (btnScatter) btnScatter.addEventListener('click', function () {
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

	if (slider) {
		slider.value = K;
		var show = function () { if (kOut) kOut.textContent = Number(K).toFixed(1); };
		show();
		slider.addEventListener('input', function () {
			K = parseFloat(slider.value);
			show();
			if (reduceMotion) stillFrame();
		});
	}

	if ('IntersectionObserver' in window) {
		new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
	}

	window.addEventListener('resize', resize);

	// --- Go -----------------------------------------------------------------------
	init();
	resize();
	if (reduceMotion) stillFrame();
	else requestAnimationFrame(frame);
})();
