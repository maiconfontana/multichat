const test = require("node:test");
const assert = require("node:assert/strict");
const { totalUnread, dockBadgeLabel } = require("../src/unread-badge");

test("totalUnread soma só valores positivos das instâncias", () => {
	assert.equal(totalUnread({ a: { unread: 3 }, b: { unread: 2 } }), 5);
	assert.equal(totalUnread({ a: { unread: 0 }, b: {} }), 0);
	assert.equal(totalUnread({ a: { unread: -4 }, b: { unread: 1.9 } }), 1);
	assert.equal(totalUnread(null), 0);
});

test("dockBadgeLabel usa o oval curto do Dock: vazio, dígitos ou 99+", () => {
	assert.equal(dockBadgeLabel(0), "");
	assert.equal(dockBadgeLabel(-1), "");
	assert.equal(dockBadgeLabel(1), "1");
	assert.equal(dockBadgeLabel(99), "99");
	assert.equal(dockBadgeLabel(100), "99+");
	assert.equal(dockBadgeLabel(1234), "99+");
});
