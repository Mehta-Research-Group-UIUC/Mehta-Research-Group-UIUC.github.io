/*
	Research page hero: a hidden Markov model, filtered live
	--------------------------------------------------------
	Five hidden states sit inside the rounded box. The true state (orange ring)
	occasionally jumps to another one (a Markov chain). Each tick it emits a token,
	a coloured square that scrolls along the strip below. The token usually matches
	the state's own colour, but not always (the "clarity" slider).

	The glow on each node is the filter's belief: the conditional probability of
	each state given every token seen so far, computed by the forward algorithm

	    pi_t(j)  proportional to  C(j, z_t) * sum_i pi_{t-1}(i) A(i, j)

	This is the same object the group's dual filter computes with a
	transformer-like architecture. Uses the shared banner CSS (.fpf-hero).
*/

(function () {
	'use strict';

	var canvas = document.getElementById('hmm-canvas');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	var hero = canvas.parentElement;
	var slider = document.getElementById('hmm-clarity');
	var out = document.getElementById('hmm-clarity-value');
	var btnJump = document.getElementById('hmm-jump');
	var btnPause = document.getElementById('hmm-pause');
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var D = 5;                                   // hidden states = token types
	var COLORS = ['#9CC3F5', '#F2C14E', '#7FD6B0', '#E58FB6', '#C6B3F2'];
	var stay = 0.93;                             // chance the state stays put each tick
	var clarity = 0.7;                           // chance a token shows the true state's colour
	var tick = 0.32;                             // seconds per token
	var A = [], C = [];
	var x = 0, belief = [], tokens = [];
	var acc = 0, last = 0;
	var running = !reduceMotion, visible = true;
	var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, bw = 0, bh = 0, nodes = [];

	function build() {
		A = []; C = [];
		for (var i = 0; i < D; i++) {
			A.push([]); C.push([]);
			for (var j = 0; j < D; j++) {
				A[i].push(i === j ? stay : (1 - stay) / (D - 1));
				C[i].push(i === j ? clarity : (1 - clarity) / (D - 1));
			}
		}
	}

	function reset() {
		belief = [];
		for (var i = 0; i < D; i++) belief.push(1 / D);
		tokens = [];
	}

	function sample(p) {
		var r = Math.random(), s = 0;
		for (var i = 0; i < p.length; i++) { s += p[i]; if (r < s) return i; }
		return p.length - 1;
	}

	function step() {
		x = sample(A[x]);
		var z = sample(C[x]);
		// forward algorithm: predict, then correct with the new token
		var nb = [], sum = 0, i, j;
		for (j = 0; j < D; j++) {
			var pred = 0;
			for (i = 0; i < D; i++) pred += belief[i] * A[i][j];
			nb.push(pred * C[j][z]);
			sum += nb[j];
		}
		for (j = 0; j < D; j++) belief[j] = nb[j] / sum;
		tokens.unshift({ z: z, x: x });
		if (tokens.length > 80) tokens.length = 80;
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = hero.clientWidth;
		H = hero.clientHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		var wide = W > 736;
		bw = wide ? Math.min(W * 0.62, 860) : W * 0.88;
		bh = wide ? H * 0.42 : H * 0.36;
		cx = W / 2;
		cy = H * (wide ? 0.5 : 0.47);
		// nodes spread across the box
		nodes = [];
		for (var i = 0; i < D; i++) {
			var t = (i + 0.5) / D;
			nodes.push([cx - bw / 2 + bw * t, cy + (i % 2 ? 0.16 : -0.16) * bh]);
		}
		hero.style.setProperty('--box-w', bw + 'px');
		draw();
	}

	function roundRect(x0, y0, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x0 + r, y0);
		ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
		ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
		ctx.arcTo(x0, y0 + h, x0, y0, r);
		ctx.arcTo(x0, y0, x0 + w, y0, r);
		ctx.closePath();
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);

		// the box
		ctx.strokeStyle = 'rgba(255,255,255,0.14)';
		ctx.lineWidth = 1;
		roundRect(cx - bw / 2, cy - bh / 2, bw, bh, Math.min(48, bh * 0.35));
		ctx.stroke();

		// transitions: faint links between neighbouring states
		ctx.strokeStyle = 'rgba(255,255,255,0.10)';
		ctx.beginPath();
		for (var i = 0; i < D; i++) {
			for (var j = i + 1; j < D; j++) {
				ctx.moveTo(nodes[i][0], nodes[i][1]);
				ctx.lineTo(nodes[j][0], nodes[j][1]);
			}
		}
		ctx.stroke();

		var R = Math.min(bh * 0.2, bw * 0.06);
		for (i = 0; i < D; i++) {
			var n = nodes[i], b = belief[i];
			// belief glow
			var g = ctx.createRadialGradient(n[0], n[1], 0, n[0], n[1], R * (1 + 2.2 * b));
			g.addColorStop(0, hexA(COLORS[i], 0.15 + 0.75 * b));
			g.addColorStop(1, hexA(COLORS[i], 0));
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(n[0], n[1], R * (1 + 2.2 * b), 0, 2 * Math.PI);
			ctx.fill();
			// node
			ctx.fillStyle = hexA(COLORS[i], 0.9);
			ctx.beginPath();
			ctx.arc(n[0], n[1], R * 0.32, 0, 2 * Math.PI);
			ctx.fill();
			// belief as a number
			ctx.fillStyle = 'rgba(255,255,255,0.75)';
			ctx.font = '600 12px "Source Sans 3", "Helvetica Neue", Arial, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(Math.round(b * 100) + '%', n[0], n[1] + R * 0.32 + 16);
		}

		// the true hidden state
		var t = nodes[x];
		ctx.strokeStyle = '#FF5F05';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(t[0], t[1], R * 0.32 + 7, 0, 2 * Math.PI);
		ctx.stroke();

		// token stream below the box, newest on the left, sliding right
		var y = cy + bh / 2 + Math.max(22, bh * 0.16), size = Math.max(9, Math.min(13, bw / 70));
		var x0 = cx - bw / 2, gap = size + 4, shift = (acc / tick) * gap;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x0, y - size, bw, size * 2);
		ctx.clip();
		for (var k = 0; k < tokens.length; k++) {
			var px = x0 + k * gap + shift;
			if (px > x0 + bw) break;
			ctx.fillStyle = hexA(COLORS[tokens[k].z], k === 0 ? 1 : Math.max(0.25, 0.9 - k * 0.012));
			ctx.fillRect(px, y - size / 2, size, size);
		}
		ctx.restore();
		ctx.fillStyle = 'rgba(201, 212, 227, 0.8)';
		ctx.font = '600 12px "Source Sans 3", "Helvetica Neue", Arial, sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText('observed tokens', x0, y + size + 14);
	}

	function hexA(hex, a) {
		var n = parseInt(hex.slice(1), 16);
		return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
	}

	function frame(now) {
		var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
		last = now;
		if (running && visible) {
			acc += dt;
			while (acc >= tick) { acc -= tick; step(); }
			draw();
		}
		requestAnimationFrame(frame);
	}

	// --- Controls --------------------------------------------------------------------
	if (slider) {
		slider.value = clarity;
		var show = function () { if (out) out.textContent = Math.round(clarity * 100) + '%'; };
		show();
		slider.addEventListener('input', function () {
			clarity = parseFloat(slider.value);
			build();
			show();
		});
	}

	function jump() {
		var y;
		do { y = Math.floor(Math.random() * D); } while (y === x);
		x = y;
		if (reduceMotion) { for (var k = 0; k < 8; k++) step(); }
		draw();
	}

	if (btnJump) btnJump.addEventListener('click', jump);
	canvas.addEventListener('click', jump);

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

	build();
	reset();
	for (var k = 0; k < 40; k++) step();      // start with a stream already flowing
	resize();
	if (!reduceMotion) requestAnimationFrame(frame);
})();
