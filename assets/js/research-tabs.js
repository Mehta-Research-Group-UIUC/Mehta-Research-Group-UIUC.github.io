/*
	Research page tabs
	------------------
	Two tab lists (current projects and past projects) share one set of panels.
	Each tab is a link to #panel-id, so links like research.html#kalman open the
	right project; older links (research.html#fpf etc.) are mapped below.
	Arrow keys move between tabs (standard ARIA tabs behaviour).
*/
(function () {
	'use strict';

	var tabs = Array.prototype.slice.call(document.querySelectorAll('.rtabs [role="tab"]'));
	var panels = Array.prototype.slice.call(document.querySelectorAll('.rpanel[role="tabpanel"]'));
	if (!tabs.length) return;

	// Old anchors (home page, menus, other sites) -> new tab ids
	var legacy = {
		'reinforcement-learning': 'rl-hmm',
		'fpf': 'filtering',
		'nonlinear-filtering': 'filtering',
		'epidemiology': 'epidemiology',
		'soft-robotics': 'soft-robotics',
		'past': 'soft-robotics',
		'past-sensorimotor': 'sensorimotor',
		'past-rhythms': 'rhythms',
		'past-mfg': 'mfg'
	};

	function panelFor(tab) { return document.getElementById(tab.getAttribute('aria-controls')); }

	function select(tab, opts) {
		opts = opts || {};
		tabs.forEach(function (t) {
			var on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
		});
		panels.forEach(function (p) { p.hidden = p !== panelFor(tab); });
		document.querySelectorAll('.rtabs').forEach(function (list) {
			list.classList.toggle('has-active', list.contains(tab));
		});
		if (opts.focus) tab.focus();
		if (opts.updateHash && history.replaceState) {
			history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
		}
		// let MathJax typeset a panel that was hidden when the page loaded
		if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([panelFor(tab)]).catch(function () {});
		// pause any video in panels that are now hidden
		panels.forEach(function (p) {
			if (p.hidden) p.querySelectorAll('iframe[data-src]').forEach(function (f) { f.removeAttribute('src'); });
			else p.querySelectorAll('iframe[data-src]').forEach(function (f) { if (!f.getAttribute('src')) f.setAttribute('src', f.getAttribute('data-src')); });
		});
	}

	tabs.forEach(function (tab, i) {
		tab.addEventListener('click', function (e) {
			e.preventDefault();
			select(tab, { updateHash: true });
		});
		tab.addEventListener('keydown', function (e) {
			var k = e.key, j = -1;
			if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % tabs.length;
			if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
			if (k === 'Home') j = 0;
			if (k === 'End') j = tabs.length - 1;
			if (j >= 0) { e.preventDefault(); select(tabs[j], { focus: true, updateHash: true }); }
		});
	});

	function fromHash(scroll) {
		var id = location.hash.slice(1);
		id = legacy[id] || id;
		var tab = tabs.filter(function (t) { return t.getAttribute('aria-controls') === id; })[0];
		if (!tab) return false;
		select(tab);
		if (scroll) {
			var box = document.querySelector('.research-tabs');
			if (box) setTimeout(function () { box.scrollIntoView({ block: 'start' }); }, 50);
		}
		return true;
	}

	window.addEventListener('hashchange', function () { fromHash(true); });
	if (!fromHash(true)) select(tabs[0]);
})();
