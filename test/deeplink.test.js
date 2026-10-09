const test = require("node:test");
const assert = require("node:assert/strict");

const {
	WHATSAPP_WEB,
	TEAMS_WEB,
	parseDeeplink,
	matchingAccounts,
	findDeeplinkInArgv,
	accountKind
} = require("../src/deeplink");

test("whatsapp://send vira o URL de conversa do WhatsApp Web", () => {
	const parsed = parseDeeplink("whatsapp://send?phone=5511987654321&text=oi%20time");
	assert.equal(parsed.kind, "whatsapp");
	assert.equal(parsed.loadUrl, "https://web.whatsapp.com/send?phone=5511987654321&text=oi+time");
});

test("wa.me com telefone e texto", () => {
	const parsed = parseDeeplink("https://wa.me/+5511987654321?text=oi");
	assert.equal(parsed.kind, "whatsapp");
	assert.match(parsed.loadUrl, /phone=5511987654321/);
	assert.match(parsed.loadUrl, /text=oi/);
});

test("whatsapp:// sem destino só foca o WhatsApp Web", () => {
	assert.deepEqual(parseDeeplink("whatsapp://chat"), { kind: "whatsapp", loadUrl: WHATSAPP_WEB });
});

test("convite de grupo do chat.whatsapp.com", () => {
	const parsed = parseDeeplink("https://chat.whatsapp.com/AbCdEf123");
	assert.equal(parsed.kind, "whatsapp");
	assert.equal(parsed.loadUrl, "https://chat.whatsapp.com/AbCdEf123");
});

test("reunião do Teams em https e nos protocolos nativos", () => {
	const join = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc/0?context=%7b%7d";
	const https = parseDeeplink(join);
	assert.equal(https.kind, "teams");
	assert.match(https.loadUrl, /\/l\/meetup-join\//);
	assert.equal(https.loadUrl.startsWith("https://"), true);

	const native = parseDeeplink("msteams://teams.microsoft.com/l/meetup-join/19%3ameeting_abc");
	assert.equal(native.kind, "teams");
	assert.match(native.loadUrl, /meetup-join/);

	const hyphen = parseDeeplink("ms-teams://teams.live.com/meet/123");
	assert.equal(hyphen.kind, "teams");
	assert.equal(hyphen.loadUrl.startsWith("https://teams.live.com/"), true);
});

test("Teams sem caminho específico abre o cliente web", () => {
	assert.equal(parseDeeplink("https://teams.microsoft.com/").loadUrl, TEAMS_WEB);
});

test("recusa esquemas perigosos e hosts desconhecidos", () => {
	assert.equal(parseDeeplink("javascript:alert(1)"), null);
	assert.equal(parseDeeplink("file:///tmp/x"), null);
	assert.equal(parseDeeplink("https://evil.example/wa.me/5511"), null);
	assert.equal(parseDeeplink("not a url"), null);
	assert.equal(parseDeeplink(""), null);
});

test("telefone inválido não entra no send", () => {
	const parsed = parseDeeplink("whatsapp://send?phone=12&text=oi");
	assert.equal(parsed.loadUrl.includes("phone="), false);
	assert.match(parsed.loadUrl, /text=oi/);
});

test("matchingAccounts escolhe o tipo certo e aceita URL custom do Teams", () => {
	const accounts = [
		{ id: "a", name: "WA 1" },
		{ id: "b", name: "WA 2", type: "whatsapp" },
		{ id: "c", name: "Trabalho", type: "teams" },
		{ id: "d", name: "Slack", type: "slack" },
		{ id: "e", name: "Tenant", type: "custom", url: "https://teams.microsoft.com/v2/" }
	];
	assert.deepEqual(matchingAccounts(accounts, "whatsapp").map(a => a.id), ["a", "b"]);
	assert.deepEqual(matchingAccounts(accounts, "teams").map(a => a.id), ["c", "e"]);
	assert.deepEqual(matchingAccounts(accounts, "discord"), []);
});

test("findDeeplinkInArgv ignora o executável e flags", () => {
	assert.equal(findDeeplinkInArgv([
		"/usr/bin/electron",
		".",
		"--spell-lang=pt-BR",
		"whatsapp://send?phone=5511999887766"
	]), "whatsapp://send?phone=5511999887766");
	assert.equal(findDeeplinkInArgv(["electron", "."]), null);
});

test("accountKind só classifica WhatsApp e Teams", () => {
	assert.equal(accountKind(undefined), "whatsapp");
	assert.equal(accountKind("whatsapp"), "whatsapp");
	assert.equal(accountKind("teams"), "teams");
	assert.equal(accountKind("telegram"), null);
});
