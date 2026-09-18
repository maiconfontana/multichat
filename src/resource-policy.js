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

function defaultAccountSuspend(envValue = process.env.MULTICHAT_SUSPEND_MINUTES) {
	const ms = getSuspendAfterMs(envValue);
	if (ms === 0)
		return { enabled: false, afterMinutes: DEFAULT_SUSPEND_MINUTES };
	return { enabled: true, afterMinutes: ms / 60 / 1000 };
}

function normalizeAccountSuspend(raw, envValue = process.env.MULTICHAT_SUSPEND_MINUTES) {
	const fallback = defaultAccountSuspend(envValue);
	if (!raw || typeof raw !== 'object')
		return fallback;

	const enabled = raw.enabled === undefined ? fallback.enabled : raw.enabled !== false;
	let afterMinutes = Number(raw.afterMinutes);
	if (!Number.isFinite(afterMinutes) || afterMinutes < 1 || afterMinutes > MAX_SUSPEND_MINUTES)
		afterMinutes = fallback.afterMinutes;
	else
		afterMinutes = Math.round(afterMinutes);

	return { enabled: !!enabled, afterMinutes };
}

function getAccountSuspendAfterMs(account, envValue = process.env.MULTICHAT_SUSPEND_MINUTES) {
	const policy = normalizeAccountSuspend(account && account.suspend, envValue);
	return policy.enabled ? Math.round(policy.afterMinutes * 60 * 1000) : 0;
}

function hibernateNowState({ loaded = false, isActive = false, otherCount = 0 } = {}) {
	if (!loaded) return { enabled: false, reason: 'already' };
	if (isActive && Number(otherCount) < 1) return { enabled: false, reason: 'only-visible' };
	return { enabled: true, reason: null };
}

function pickAccountAfterHibernate(accounts, hibernateId, isLoaded = () => false) {
	const others = (accounts || []).filter(account => account && account.id !== hibernateId);
	if (others.length === 0) return null;
	return others.find(account => isLoaded(account.id)) || others[0];
}

module.exports = {
	DEFAULT_SUSPEND_MINUTES,
	MAX_SUSPEND_MINUTES,
	getSuspendAfterMs,
	formatSuspendPolicy,
	defaultAccountSuspend,
	normalizeAccountSuspend,
	getAccountSuspendAfterMs,
	hibernateNowState,
	pickAccountAfterHibernate
};
