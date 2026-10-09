'use strict';

// O Dock do macOS desenha o selo vermelho nativo. Números longos viram uma
// pílula larga; 99+ cabe no oval pequeno que a Apple já usa no Mail/Messages.

function totalUnread(instances) {
	let total = 0;
	if (!instances || typeof instances !== 'object') return 0;
	for (const id of Object.keys(instances)) {
		const value = Number(instances[id] && instances[id].unread);
		if (Number.isFinite(value) && value > 0) total += Math.floor(value);
	}
	return total;
}

function dockBadgeLabel(count) {
	const n = Math.floor(Number(count) || 0);
	if (n <= 0) return '';
	if (n > 99) return '99+';
	return String(n);
}

module.exports = { totalUnread, dockBadgeLabel };
