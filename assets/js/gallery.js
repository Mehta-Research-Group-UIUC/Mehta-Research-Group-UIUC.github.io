/*
	Gallery page
	------------
	1. Photo fallback: each <img> points at a local copy in images/gallery/.
	   If that file is missing, it switches to the original on Google's servers
	   (data-remote). Run download_gallery.py once to make every photo local.
	2. Filters: All / Milestones / Group life / Events.
	3. Lightbox: click a photo to view it large. Arrow keys or swipe to move,
	   Escape or the close button to leave.
*/
(function () {
	'use strict';

	var photos = Array.prototype.slice.call(document.querySelectorAll('.g-photo img'));
	if (!photos.length) return;

	// 1. Fallback to the remote copy
	photos.forEach(function (img) {
		function swap() {
			var r = img.getAttribute('data-remote');
			if (r && img.src.indexOf(r) === -1) img.src = r;
		}
		if (img.complete && img.naturalWidth === 0) swap();
		img.addEventListener('error', swap);
	});

	// 2. Filters
	var chips = document.querySelectorAll('[data-gfilter]');
	var events = document.querySelectorAll('.g-event');
	chips.forEach(function (c) {
		c.addEventListener('click', function () {
			var f = c.getAttribute('data-gfilter');
			chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
			events.forEach(function (e) { e.hidden = !(f === 'all' || e.getAttribute('data-cat') === f); });
		});
	});

	// 3. Lightbox
	var box = document.createElement('div');
	box.className = 'lightbox';
	box.hidden = true;
	box.setAttribute('role', 'dialog');
	box.setAttribute('aria-modal', 'true');
	box.setAttribute('aria-label', 'Photo viewer');
	box.innerHTML =
		'<button type="button" class="lb-close" aria-label="Close">&times;</button>' +
		'<button type="button" class="lb-prev" aria-label="Previous photo">&larr;</button>' +
		'<figure class="lb-figure"><img alt="" /><figcaption><span class="lb-cap"></span><span class="lb-count"></span></figcaption></figure>' +
		'<button type="button" class="lb-next" aria-label="Next photo">&rarr;</button>';
	document.body.appendChild(box);

	var big = box.querySelector('img'), cap = box.querySelector('.lb-cap'), count = box.querySelector('.lb-count');
	var list = [], at = 0, opener = null;

	function visiblePhotos() {
		return photos.filter(function (img) { return !img.closest('.g-event').hidden; });
	}

	function show(i) {
		at = (i + list.length) % list.length;
		var img = list[at];
		big.src = img.currentSrc || img.src;
		big.alt = img.alt;
		var ev = img.closest('.g-event');
		cap.textContent = ev.querySelector('h3').textContent + ' \u00b7 ' + ev.querySelector('time').textContent.replace(/\s+/g, ' ').trim();
		count.textContent = (at + 1) + ' / ' + list.length;
	}

	function open(img) {
		list = visiblePhotos();
		opener = img.closest('button');
		show(list.indexOf(img));
		box.hidden = false;
		document.documentElement.classList.add('lb-open');
		box.querySelector('.lb-close').focus();
	}

	function close() {
		box.hidden = true;
		document.documentElement.classList.remove('lb-open');
		if (opener) opener.focus();
	}

	photos.forEach(function (img) {
		img.closest('button').addEventListener('click', function () { open(img); });
	});

	box.querySelector('.lb-close').addEventListener('click', close);
	box.querySelector('.lb-prev').addEventListener('click', function () { show(at - 1); });
	box.querySelector('.lb-next').addEventListener('click', function () { show(at + 1); });
	box.addEventListener('click', function (e) { if (e.target === box) close(); });

	document.addEventListener('keydown', function (e) {
		if (box.hidden) return;
		if (e.key === 'Escape') close();
		if (e.key === 'ArrowRight') show(at + 1);
		if (e.key === 'ArrowLeft') show(at - 1);
		if (e.key === 'Tab') {                      // keep focus inside the viewer
			var f = box.querySelectorAll('button'), first = f[0], lastB = f[f.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastB.focus(); }
			else if (!e.shiftKey && document.activeElement === lastB) { e.preventDefault(); first.focus(); }
		}
	});

	// swipe on touch screens
	var x0 = null;
	box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
	box.addEventListener('touchend', function (e) {
		if (x0 === null) return;
		var dx = e.changedTouches[0].clientX - x0;
		if (Math.abs(dx) > 45) show(at + (dx < 0 ? 1 : -1));
		x0 = null;
	});
})();
