/*
	Course wall (teaching.html)
	---------------------------
	One full-width "wall" per course in a horizontal track. Swiping on touch
	screens and trackpads is native scrolling (CSS scroll-snap does the snapping);
	this script adds the arrows, the course tabs, the dots, arrow-key support,
	and links like teaching.html#ece515 that open straight on a course.
*/
(function () {
	'use strict';

	var track = document.querySelector('.course-track');
	if (!track) return;

	var walls = Array.prototype.slice.call(track.querySelectorAll('.course'));
	var tabs = Array.prototype.slice.call(document.querySelectorAll('.course-tabs a'));
	var dots = document.querySelector('.course-dots');
	var prev = document.querySelector('.course-prev');
	var next = document.querySelector('.course-next');
	var current = 0;

	// Build one dot per course
	walls.forEach(function (w, i) {
		var b = document.createElement('button');
		b.type = 'button';
		b.setAttribute('aria-label', 'Show ' + w.getAttribute('aria-label'));
		b.addEventListener('click', function () { go(i); });
		dots.appendChild(b);
	});
	var dotBtns = Array.prototype.slice.call(dots.children);

	function go(i, instant) {
		i = Math.max(0, Math.min(walls.length - 1, i));
		track.scrollTo({ left: walls[i].offsetLeft - track.offsetLeft, behavior: instant ? 'auto' : 'smooth' });
	}

	var userMoved = false;   // only write #course into the address bar after the visitor moves,
	                         // otherwise the browser jumps down to the wall on page load

	function mark(i) {
		current = i;
		walls.forEach(function (w, j) { w.setAttribute('aria-hidden', String(j !== i)); });
		tabs.forEach(function (t, j) { t.classList.toggle('is-active', j === i); t.setAttribute('aria-current', j === i ? 'true' : 'false'); });
		dotBtns.forEach(function (d, j) { d.classList.toggle('is-active', j === i); });
		if (prev) prev.disabled = i === 0;
		if (next) next.disabled = i === walls.length - 1;
		var id = walls[i].id;
		if (userMoved && id && location.hash !== '#' + id && history.replaceState) history.replaceState(null, '', '#' + id);
	}

	// Which wall is in view?
	var ticking = false;
	track.addEventListener('scroll', function () {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(function () {
			ticking = false;
			var i = Math.round(track.scrollLeft / track.clientWidth);
			if (i !== current) { userMoved = true; mark(i); }
		});
	});

	if (prev) prev.addEventListener('click', function () { go(current - 1); });
	if (next) next.addEventListener('click', function () { go(current + 1); });

	tabs.forEach(function (t, i) {
		t.addEventListener('click', function (e) { e.preventDefault(); go(i); });
	});

	track.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
		if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
	});

	// Open on the course named in the link, e.g. teaching.html#tam541
	function fromHash() {
		var id = location.hash.slice(1);
		for (var i = 0; i < walls.length; i++) {
			if (walls[i].id === id) { go(i, true); mark(i); return true; }
		}
		return false;
	}
	window.addEventListener('hashchange', fromHash);
	if (!fromHash()) mark(0);

	window.addEventListener('resize', function () { go(current, true); });
})();
