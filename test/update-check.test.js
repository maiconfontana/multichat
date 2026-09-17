const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
	API_URL,
	parseVersion,
	compareVersions,
	isNewer,
	pickAssetForPlatform,
	normalizeRelease,
	checkForUpdate
} = require("../src/update-check");

const ROOT = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

// Monta um fetch falso que devolve a resposta informada uma única vez.
const fakeFetch = (payload, { ok = true, status = 200 } = {}) => async () => ({
	ok,
	status,
	json: async () => payload
});

const RELEASE_FIXTURE = {
	tag_name: "v1.6.0",
	html_url: "https://github.com/maiconfontana/multichat/releases/tag/v1.6.0",
	body: "## Novidades\n- página pública",
	assets: [
		{ name: "MultiChat-1.6.0.AppImage", browser_download_url: "https://example.test/MultiChat-1.6.0.AppImage" },
		{ name: "multichat-1.6.0.tar.xz", browser_download_url: "https://example.test/multichat-1.6.0.tar.xz" },
		{ name: "MultiChat-1.6.0-setup.exe", browser_download_url: "https://example.test/MultiChat-1.6.0-setup.exe" },
		{ name: "MultiChat-1.6.0-mac-arm64.dmg", browser_download_url: "https://example.test/MultiChat-1.6.0-mac-arm64.dmg" }
	]
};

test("parseVersion normaliza prefixo v, sufixo de build e completa segmentos", () => {
	assert.deepEqual(parseVersion("v1.6"), { numbers: [1, 6, 0], pre: null });
	assert.deepEqual(parseVersion("1.6.0+build.7"), { numbers: [1, 6, 0], pre: null });
	assert.deepEqual(parseVersion("1.6.0-beta.2"), { numbers: [1, 6, 0], pre: "beta.2" });
	assert.equal(parseVersion(""), null);
	assert.equal(parseVersion("abc"), null);
});

test("compareVersions ordena versões e trata pré-lançamento", () => {
	assert.equal(compareVersions("1.6.0", "1.5.0"), 1);
	assert.equal(compareVersions("1.5.0", "1.6.0"), -1);
	assert.equal(compareVersions("v1.6.0", "1.6.0"), 0);
	assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
	assert.equal(compareVersions("1.6.0-beta.1", "1.6.0"), -1);
	assert.equal(compareVersions("1.6.0", "1.6.0-beta.1"), 1);
});

test("isNewer não acusa atualização quando a versão é igual ou mais nova", () => {
	assert.equal(isNewer("1.6.0", "1.5.0"), true);
	assert.equal(isNewer("1.5.0", "1.5.0"), false);
	assert.equal(isNewer("1.4.0", "1.5.0"), false);
});

test("pickAssetForPlatform escolhe o instalador certo por sistema", () => {
	assert.equal(pickAssetForPlatform(RELEASE_FIXTURE.assets, "win32").name, "MultiChat-1.6.0-setup.exe");
	assert.equal(pickAssetForPlatform(RELEASE_FIXTURE.assets, "darwin").name, "MultiChat-1.6.0-mac-arm64.dmg");
	assert.equal(pickAssetForPlatform(RELEASE_FIXTURE.assets, "linux").name, "MultiChat-1.6.0.AppImage");
	assert.equal(pickAssetForPlatform(RELEASE_FIXTURE.assets, "aix").name, "MultiChat-1.6.0.AppImage");
	assert.equal(pickAssetForPlatform([], "linux"), null);
	assert.equal(pickAssetForPlatform(undefined, "linux"), null);
});

test("normalizeRelease sinaliza atualização e aponta para o asset da plataforma", () => {
	const result = normalizeRelease(RELEASE_FIXTURE, { currentVersion: "1.5.0", platform: "linux" });
	assert.equal(result.updateAvailable, true);
	assert.equal(result.latestVersion, "1.6.0");
	assert.equal(result.assetName, "MultiChat-1.6.0.AppImage");
	assert.equal(result.downloadUrl, "https://example.test/MultiChat-1.6.0.AppImage");
	assert.equal(normalizeRelease(RELEASE_FIXTURE, { currentVersion: "1.6.0", platform: "linux" }).updateAvailable, false);
	assert.equal(normalizeRelease({ tag_name: "" }, { currentVersion: "1.5.0", platform: "linux" }), null);
	assert.equal(normalizeRelease(null, { currentVersion: "1.5.0", platform: "linux" }), null);
});

test("normalizeRelease cai para a página da release quando não há asset", () => {
	const result = normalizeRelease({ tag_name: "v1.6.0", html_url: "https://example.test/rel", assets: [] }, { currentVersion: "1.5.0", platform: "win32" });
	assert.equal(result.assetName, null);
	assert.equal(result.downloadUrl, "https://example.test/rel");
});

test("checkForUpdate devolve status update e current", async () => {
	const update = await checkForUpdate({ currentVersion: "1.5.0", platform: "linux", fetchImpl: fakeFetch(RELEASE_FIXTURE) });
	assert.equal(update.status, "update");
	assert.equal(update.assetName, "MultiChat-1.6.0.AppImage");

	const current = await checkForUpdate({ currentVersion: "1.6.0", platform: "linux", fetchImpl: fakeFetch(RELEASE_FIXTURE) });
	assert.equal(current.status, "current");
});

test("checkForUpdate nunca lança: HTTP ruim, payload inválido e falha de rede", async () => {
	const http = await checkForUpdate({ currentVersion: "1.5.0", fetchImpl: fakeFetch({}, { ok: false, status: 403 }) });
	assert.deepEqual({ status: http.status, reason: http.reason }, { status: "error", reason: "http-403" });

	const parse = await checkForUpdate({ currentVersion: "1.5.0", fetchImpl: fakeFetch({ tag_name: "sem-versao" }) });
	assert.equal(parse.status, "error");

	const boom = await checkForUpdate({ currentVersion: "1.5.0", fetchImpl: async () => { throw Object.assign(new Error("offline"), { code: "ENOTFOUND" }); } });
	assert.equal(boom.status, "error");
	assert.equal(boom.reason, "network-ENOTFOUND");

	const unavailable = await checkForUpdate({ currentVersion: "1.5.0", fetchImpl: null, ...{} });
	assert.equal(unavailable.status, "error");
});

test("checkForUpdate consulta a API de releases do repositório correto", async () => {
	assert.equal(API_URL, "https://api.github.com/repos/maiconfontana/multichat/releases/latest");
	let seen = null;
	await checkForUpdate({
		currentVersion: "1.5.0",
		fetchImpl: async (url, options) => {
			seen = { url, options };
			return { ok: true, status: 200, json: async () => RELEASE_FIXTURE };
		}
	});
	assert.equal(seen.url, API_URL);
	assert.equal(seen.options.headers.Accept, "application/vnd.github+json");
});

test("a versão do app é única entre package.json e constants.js", () => {
	const constantsSource = fs.readFileSync(path.join(ROOT, "src/constants.js"), "utf8");
	const match = constantsSource.match(/Constants\.version\s*=\s*"([^"]+)"/);
	assert.ok(match, "Constants.version não encontrado em src/constants.js");
	assert.equal(match[1], pkg.version, "Constants.version divergiu de package.json");
});
