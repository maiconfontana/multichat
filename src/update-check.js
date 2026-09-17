// Checagem de versão do MultiChat.
//
// Módulo puro (sem dependência de Electron) para poder ser testado em Node.
// Compara a versão local com a última release pública do GitHub e devolve a
// URL de download adequada à plataforma. Não baixa nem instala nada: o app
// apenas avisa o usuário, que decide quando atualizar.

const OWNER  = "maiconfontana";
const REPO   = "multichat";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const PAGE_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`;
const RELEASES_TIMEOUT_MS = 8000;

// Divide "1.6.0-beta.2" em { numbers: [1,6,0], pre: "beta.2" }.
// Aceita o prefixo "v" e ignora sufixos de build (+sha).
const parseVersion = (raw) => {
	const text = String(raw == null ? "" : raw).trim().replace(/^v/i, "").split("+")[0];
	if (!text) return null;
	const [core, ...preParts] = text.split("-");
	const numbers = core.split(".").map((part) => Number.parseInt(part, 10));
	if (numbers.length === 0 || numbers.some((n) => !Number.isFinite(n) || n < 0)) return null;
	while (numbers.length < 3) numbers.push(0);
	return { numbers: numbers.slice(0, 3), pre: preParts.length > 0 ? preParts.join("-") : null };
};

// -1 se a < b, 0 se iguais, 1 se a > b. Versão de pré-lançamento é sempre
// menor que a versão estável correspondente (1.6.0-beta < 1.6.0).
const compareVersions = (a, b) => {
	const va = parseVersion(a);
	const vb = parseVersion(b);
	if (!va || !vb) return 0;
	for (let i = 0; i < 3; i++) {
		if (va.numbers[i] !== vb.numbers[i]) return va.numbers[i] < vb.numbers[i] ? -1 : 1;
	}
	if (va.pre === vb.pre) return 0;
	if (va.pre === null) return 1;
	if (vb.pre === null) return -1;
	return va.pre < vb.pre ? -1 : 1;
};

const isNewer = (candidate, current) => compareVersions(candidate, current) > 0;

// Nomes gerados pelo electron-builder (ver package.json → build).
// A ordem de preferência segue o que é mais simples de instalar na plataforma.
const PLATFORM_PATTERNS = {
	win32:  [/setup\.exe$/i, /-win.*\.zip$/i, /\.exe$/i],
	darwin: [/\.dmg$/i, /-mac.*\.zip$/i, /\.zip$/i],
	linux:  [/\.AppImage$/i, /\.tar\.xz$/i, /\.deb$/i]
};

const pickAssetForPlatform = (assets, platform) => {
	const list = Array.isArray(assets) ? assets : [];
	const patterns = PLATFORM_PATTERNS[platform] || PLATFORM_PATTERNS.linux;
	for (const re of patterns) {
		const found = list.find((asset) => re.test(String(asset && asset.name || "")));
		if (found) return found;
	}
	return null;
};

const normalizeRelease = (payload, { currentVersion, platform }) => {
	if (!payload || typeof payload !== "object") return null;
	const tag = payload.tag_name || payload.name || "";
	const latestVersion = parseVersion(tag);
	if (!latestVersion) return null;

	const asset = pickAssetForPlatform(payload.assets, platform);
	const pageUrl = payload.html_url || PAGE_URL;
	return {
		latestVersion: tag.replace(/^v/i, ""),
		currentVersion: String(currentVersion),
		updateAvailable: isNewer(tag, currentVersion),
		downloadUrl: asset && asset.browser_download_url ? asset.browser_download_url : pageUrl,
		assetName: asset ? asset.name : null,
		releaseUrl: pageUrl,
		notes: typeof payload.body === "string" ? payload.body.trim() : ""
	};
};

// Consulta a última release. Nunca lança: falha vira { status: "error" } para
// não atrapalhar a inicialização do app (offline, rate limit, proxy, etc.).
const checkForUpdate = async ({ currentVersion, platform = process.platform, fetchImpl, timeoutMs = RELEASES_TIMEOUT_MS } = {}) => {
	const doFetch = fetchImpl || globalThis.fetch;
	if (typeof doFetch !== "function") {
		return { status: "error", reason: "fetch-unavailable", currentVersion: String(currentVersion) };
	}

	const controller = typeof AbortController === "function" ? new AbortController() : null;
	const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

	try {
		const response = await doFetch(API_URL, {
			headers: {
				"Accept": "application/vnd.github+json",
				"User-Agent": `MultiChat/${currentVersion}`
			},
			signal: controller ? controller.signal : undefined
		});

		if (!response || !response.ok) {
			return { status: "error", reason: `http-${response ? response.status : "unknown"}`, currentVersion: String(currentVersion) };
		}

		const release = normalizeRelease(await response.json(), { currentVersion, platform });
		if (!release) return { status: "error", reason: "release-parse", currentVersion: String(currentVersion) };

		return { status: release.updateAvailable ? "update" : "current", ...release };
	} catch (err) {
		const reason = err && err.name === "AbortError" ? "timeout" : `network-${err && err.code || "error"}`;
		return { status: "error", reason, currentVersion: String(currentVersion) };
	} finally {
		if (timer) clearTimeout(timer);
	}
};

module.exports = {
	API_URL,
	PAGE_URL,
	OWNER,
	REPO,
	parseVersion,
	compareVersions,
	isNewer,
	pickAssetForPlatform,
	normalizeRelease,
	checkForUpdate
};
