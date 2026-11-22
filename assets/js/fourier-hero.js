/*
	Teaching page hero: a Fourier series, built one term at a time
	--------------------------------------------------------------
	Each circle is one sine wave. Stacked tip to tail and spinning at
	1x, 3x, 5x ... the base frequency, they trace a square wave (or a
	sawtooth, or a triangle). More terms, better approximation; the
	overshoot at the jumps that never goes away is the Gibbs phenomenon.

	    square    (4/pi)   sum_{k odd} sin(k t) / k
	    sawtooth  (2/pi)   sum_{k>=1}  (-1)^{k+1} sin(k t) / k
	    triangle  (8/pi^2) sum_{k odd} (-1)^{(k-1)/2} sin(k t) / k^2

	Uses the same banner markup and CSS as the other pages (.fpf-hero).
	Respects prefers-reduced-motion.
*/

(function () {
	'use strict';

	var canvas = document.getElementById('fourier-canvas');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	var hero = canvas.parentElement;
	var slider = document.getElementById('fourier-terms');
	var out = document.getElementById('fourier-terms-value');
	var btnPause = document.getElementById('fourier-pause');
	var shapeBtns = document.querySelectorAll('[data-shape]');
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var shape = 'square';
	var nTerms = 5;
	var t = 0, speed = 1.1;           // radians per second of the base frequency
	var wave = [];                    // traced values, newest first
	var running = !reduceMotion, visible = true;
	var W = 0, H = 0, dpr = 1, unit = 1, ox = 0, oy = 0, waveX = 0, waveLen = 0;

	// Coefficients for the first n non-zero terms: [harmonic k, amplitude b_k]
	function terms(n) {
		var list = [], k, i;
		if (shape === 'square') {
			for (i = 0, k = 1; i < n; i++, k += 2) list.push([k, 4 / (Math.PI * k)]);
		} else if (shape === 'sawtooth') {
			for (k = 1; k <= n; k++) list.push([k, 2 / Math.PI * (k % 2 ? 1 : -1) / k]);
		} else {
			for (i = 0, k = 1; i < n; i++, k += 2) list.push([k, 8 / (Math.PI * Math.PI) * (i % 2 ? -1 : 1) / (k * k)]);
		}
		return list;
	}

	// The ideal waveform, drawn faintly so visitors can see what the circles are reaching for
	function ideal(x) {
		var p = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		if (shape === 'square') return p < Math.PI ? 1 : -1;
		if (shape === 'sawtooth') return p < Math.PI ? p / Math.PI : p / Math.PI - 2;
		return p < Math.PI / 2 ? p / (Math.PI / 2) : (p < 3 * Math.PI / 2 ? 2 - p / (Math.PI / 2) : p / (Math.PI / 2) - 4);
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = hero.clientWidth;
		H = hero.clientHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		var wide = W > 736;
		var boxW = wide ? Math.min(W * 0.72, 980) : W * 0.9;
		unit = Math.min(H * (wide ? 0.13 : 0.11), boxW * 0.11);   // pixels per unit amplitude
		ox = W / 2 - boxW / 2 + unit * 1.45;                       // centre of the first circle
		oy = H * (wide ? 0.6 : 0.58);
		waveX = ox + unit * 2.1;                                   // where the traced wave starts
		waveLen = W / 2 + boxW / 2 - waveX;
		hero.style.setProperty('--box-w', boxW + 'px');
		draw();
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);

		// Axis for the wave
		ctx.strokeStyle = 'rgba(255,255,255,0.12)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(waveX, oy);
		ctx.lineTo(waveX + waveLen, oy);
		ctx.stroke();

		// The target waveform, dashed
		var pxPerRad = unit * 0.9;
		ctx.strokeStyle = 'rgba(255,255,255,0.22)';
		ctx.setLineDash([4, 5]);
		ctx.beginPath();
		for (var x = 0; x <= waveLen; x += 2) {
			var y = oy - unit * ideal(t - x / pxPerRad);
			if (x === 0) ctx.moveTo(waveX + x, y); else ctx.lineTo(waveX + x, y);
		}
		ctx.stroke();
		ctx.setLineDash([]);

		// Epicycles: one circle per term, tip to tail
		var cx = ox, cy = oy, list = terms(nTerms);
		for (var i = 0; i < list.length; i++) {
			var k = list[i][0], b = list[i][1], r = Math.abs(b) * unit;
			var ang = k * t + (b < 0 ? Math.PI : 0);
			var nx = cx + r * Math.cos(ang), ny = cy - r * Math.sin(ang);
			if (r > 0.6) {
				ctx.strokeStyle = 'rgba(255,255,255,' + (i === 0 ? 0.28 : 0.14) + ')';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, 2 * Math.PI);
				ctx.stroke();
			}
			ctx.strokeStyle = 'rgba(156, 195, 245, 0.9)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(nx, ny);
			ctx.stroke();
			cx = nx; cy = ny;
		}

		// Record the tip height and draw the traced wave
		wave.unshift(cy);
		var maxPts = Math.ceil(waveLen / 1.5);
		if (wave.length > maxPts) wave.length = maxPts;

		ctx.strokeStyle = 'rgba(255,255,255,0.35)';
		ctx.setLineDash([3, 4]);
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(waveX, cy);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.strokeStyle = '#9CC3F5';
		ctx.lineWidth = 2.5;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		for (var j = 0; j < wave.length; j++) {
			var wx = waveX + j * 1.5;
			if (j === 0) ctx.moveTo(wx, wave[j]); else ctx.lineTo(wx, wave[j]);
		}
		ctx.stroke();

		// Pen tip
		ctx.fillStyle = '#FF5F05';
		ctx.beginPath();
		ctx.arc(cx, cy, 4.5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(waveX, cy, 4.5, 0, 2 * Math.PI);
		ctx.fill();
	}

	// Fill the trace instantly (used on start, on changes, and for reduced motion)
	function prefill() {
		wave = [];
		var steps = Math.ceil(waveLen / 1.5), dtheta = 1.5 / (unit * 0.9);
		t -= steps * dtheta;
		for (var s = 0; s < steps; s++) { t += dtheta; drawSilently(); }
		draw();
	}

	function drawSilently() {
		var cy = oy, list = terms(nTerms);
		for (var i = 0; i < list.length; i++) cy -= list[i][1] * unit * Math.sin(list[i][0] * t);
		wave.unshift(cy);
	}

	var last = 0;
	function frame(now) {
		var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
		last = now;
		if (running && visible) {
			// advance so the trace scrolls at exactly 1.5 px per stored point
			var steps = Math.max(1, Math.round(dt * speed * unit * 0.9 / 1.5));
			var dtheta = 1.5 / (unit * 0.9);
			for (var s = 0; s < steps - 1; s++) { t += dtheta; drawSilently(); }
			t += dtheta;
			draw();
		}
		requestAnimationFrame(frame);
	}

	// --- Controls -------------------------------------------------------------------
	if (slider) {
		slider.value = nTerms;
		var show = function () { if (out) out.textContent = nTerms; };
		show();
		slider.addEventListener('input', function () {
			nTerms = parseInt(slider.value, 10);
			show();
			prefill();
		});
	}

	shapeBtns.forEach(function (b) {
		b.addEventListener('click', function () {
			shape = b.getAttribute('data-shape');
			shapeBtns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
			prefill();
		});
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

	window.addEventListener('resize', function () { resize(); prefill(); });

	resize();
	prefill();
	if (!reduceMotion) requestAnimationFrame(frame);
})();
