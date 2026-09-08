'use strict';

const DEFAULT_SUSPEND_MINUTES = 60;
const MAX_SUSPEND_MINUTES = 24 * 60;

function getSuspendAfterMs(value = process.env.MULTICHAT_SUSPEND_MINUTES) {
	if (value === undefined || value === null || String(value).trim() === '')
		return DEFAULT_SUSPEND_MINUTES * 60 * 1000;

	const minutes = Number(value);
	if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_SUSPEND_MINUTES)
		return DEFAULT_SUSPEND_MINUTES * 60 * 1000;

	if (minutes === 0) return 0;
	return Math.round(minutes * 60 * 1000);
}

function formatSuspendPolicy(milliseconds) {
	if (milliseconds === 0) return 'desativada';
	const minutes = milliseconds / 60 / 1000;
	return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
}

module.exports = {
	DEFAULT_SUSPEND_MINUTES,
	MAX_SUSPEND_MINUTES,
	getSuspendAfterMs,
	formatSuspendPolicy
};
