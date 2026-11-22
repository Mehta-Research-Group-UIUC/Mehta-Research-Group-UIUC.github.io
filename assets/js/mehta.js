/*
	Mehta Research Group — small site helpers (no dependencies)
*/
(function () {
	'use strict';

	// 1. Team photos: if images/team/<name>.jpg is missing, show initials instead.
	//    Add a photo later simply by dropping the file in with the same name.
	function initials(name) {
		return name.replace(/\(.*?\)/g, '').trim().split(/\s+/)
			.filter(function (w) { return /^[A-Z]/.test(w) && w.length > 1; })
			.map(function (w) { return w[0]; })
			.filter(function (_, i, arr) { return i === 0 || i === arr.length - 1; })
			.join('');
	}

	function fallback(img) {
		var d = document.createElement('div');
		d.className = img.className + ' initials';
		d.setAttribute('role', 'img');
		d.setAttribute('aria-label', img.alt);
		d.textContent = initials(img.alt.replace(/^Portrait of /, ''));
		img.replaceWith(d);
	}

	document.querySelectorAll('img.avatar').forEach(function (img) {
		if (img.complete && img.naturalWidth === 0) fallback(img);
		else img.addEventListener('error', function () { fallback(img); });
	});

	// 2. Research page: highlight the section you are reading in the sidebar.
	var toc = document.querySelector('.toc');
	if (toc && 'IntersectionObserver' in window) {
		var links = {};
		toc.querySelectorAll('a[href^="#"]').forEach(function (a) {
			links[a.getAttribute('href').slice(1)] = a;
		});
		var sections = document.querySelectorAll('.area[id]');
		var obs = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (!e.isIntersecting) return;
				Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
				if (links[e.target.id]) links[e.target.id].classList.add('is-active');
			});
		}, { rootMargin: '-30% 0px -60% 0px' });
		sections.forEach(function (s) { obs.observe(s); });
	}
})();

// 3. Awards page: filter the list by category (Research / Teaching / Honors).
(function () {
	var buttons = document.querySelectorAll('[data-filter]');
	if (!buttons.length) return;
	var items = document.querySelectorAll('.award[data-cat]');
	buttons.forEach(function (b) {
		b.addEventListener('click', function () {
			var cat = b.getAttribute('data-filter');
			buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
			items.forEach(function (li) {
				li.hidden = !(cat === 'all' || li.getAttribute('data-cat') === cat);
			});
			// when filtered, show every year label so each row stays readable
			document.querySelectorAll('.award-year.is-repeat').forEach(function (y) {
				y.classList.toggle('is-shown', cat !== 'all');
			});
		});
	});
})();