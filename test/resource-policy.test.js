'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
	DEFAULT_SUSPEND_MINUTES,
	MAX_SUSPEND_MINUTES,
	getSuspendAfterMs,
	formatSuspendPolicy,
	defaultAccountSuspend,
	normalizeAccountSuspend,
	getAccountSuspendAfterMs
} = require('../src/resource-policy');

test('usa 60 minutos por padrão', () => {
	assert.equal(DEFAULT_SUSPEND_MINUTES, 60);
	assert.equal(getSuspendAfterMs(undefined), 60 * 60 * 1000);
	assert.equal(getSuspendAfterMs(''), 60 * 60 * 1000);
});

test('aceita desativação e minutos fracionários', () => {
	assert.equal(getSuspendAfterMs('0'), 0);
	assert.equal(getSuspendAfterMs('90'), 90 * 60 * 1000);
	assert.equal(getSuspendAfterMs('0.5'), 30 * 1000);
});

test('rejeita valores inválidos ou excessivos', () => {
	const fallback = DEFAULT_SUSPEND_MINUTES * 60 * 1000;
	assert.equal(getSuspendAfterMs('-1'), fallback);
	assert.equal(getSuspendAfterMs('abc'), fallback);
	assert.equal(getSuspendAfterMs(String(MAX_SUSPEND_MINUTES + 1)), fallback);
});

test('descreve a política para logs', () => {
	assert.equal(formatSuspendPolicy(0), 'desativada');
	assert.equal(formatSuspendPolicy(60 * 1000), '1 minuto');
	assert.equal(formatSuspendPolicy(60 * 60 * 1000), '60 minutos');
});

test('usa o env como padrão de contas sem ajuste', () => {
	assert.deepEqual(defaultAccountSuspend(undefined), { enabled: true, afterMinutes: 60 });
	assert.deepEqual(defaultAccountSuspend('0'), { enabled: false, afterMinutes: 60 });
	assert.deepEqual(defaultAccountSuspend('90'), { enabled: true, afterMinutes: 90 });
});

test('normaliza hibernação por conta', () => {
	assert.deepEqual(normalizeAccountSuspend(undefined, '60'), { enabled: true, afterMinutes: 60 });
	assert.deepEqual(normalizeAccountSuspend({ enabled: false, afterMinutes: 20 }, '60'), { enabled: false, afterMinutes: 20 });
	assert.deepEqual(normalizeAccountSuspend({ enabled: true, afterMinutes: 15 }, '0'), { enabled: true, afterMinutes: 15 });
	assert.deepEqual(normalizeAccountSuspend({ enabled: true, afterMinutes: 0 }, '90'), { enabled: true, afterMinutes: 90 });
	assert.deepEqual(normalizeAccountSuspend({ enabled: true, afterMinutes: 2000 }, '60'), { enabled: true, afterMinutes: 60 });
});

test('converte a política da conta em milissegundos', () => {
	assert.equal(getAccountSuspendAfterMs({}, '60'), 60 * 60 * 1000);
	assert.equal(getAccountSuspendAfterMs({ suspend: { enabled: false, afterMinutes: 30 } }, '60'), 0);
	assert.equal(getAccountSuspendAfterMs({ suspend: { enabled: true, afterMinutes: 5 } }, '60'), 5 * 60 * 1000);
	assert.equal(getAccountSuspendAfterMs({}, '0'), 0);
});
