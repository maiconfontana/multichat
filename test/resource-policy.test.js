'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
	DEFAULT_SUSPEND_MINUTES,
	MAX_SUSPEND_MINUTES,
	getSuspendAfterMs,
	formatSuspendPolicy
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
