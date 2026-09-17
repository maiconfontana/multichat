#!/usr/bin/env node
// Sobe a versão do app em um passo único.
//
// A versão aparece em dois lugares que precisam ficar em sincronia — e um
// teste (test/update-check.test.js) falha se divergirem:
//   - package.json          (usado pelo electron-builder e por app.getVersion())
//   - src/constants.js      (usado pelo menu quando roda do código-fonte)
//
// Uso:
//   node scripts/bump-version.js 1.6.0
//   node scripts/bump-version.js minor
//   node scripts/bump-version.js major
//   node scripts/bump-version.js patch
//
// Não cria tag nem commit: o release é disparado pela tag (ver release.yml).

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");
const CONSTANTS_PATH = path.join(ROOT, "src", "constants.js");

const parse = (raw) => {
	const match = String(raw).trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) return null;
	return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

const bump = (current, kind) => {
	switch (kind) {
		case "major": return { major: current.major + 1, minor: 0, patch: 0 };
		case "minor": return { major: current.major, minor: current.minor + 1, patch: 0 };
		case "patch": return { major: current.major, minor: current.minor, patch: current.patch + 1 };
		default: return null;
	}
};

const main = () => {
	const argument = process.argv[2];
	if (!argument) {
		console.error("Uso: node scripts/bump-version.js <maior.menor.patch | major | minor | patch>");
		process.exit(1);
	}

	const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
	const current = parse(pkg.version);
	if (!current) {
		console.error(`Versão atual inválida em package.json: ${pkg.version}`);
		process.exit(1);
	}

	const next = parse(argument) || bump(current, argument);
	if (!next) {
		console.error(`Argumento inválido: ${argument}`);
		process.exit(1);
	}

	const nextVersion = `${next.major}.${next.minor}.${next.patch}`;
	const currentVersion = `${current.major}.${current.minor}.${current.patch}`;
	if (nextVersion === currentVersion) {
		console.error(`A versão já é ${currentVersion}.`);
		process.exit(1);
	}

	pkg.version = nextVersion;
	fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

	const constantsSource = fs.readFileSync(CONSTANTS_PATH, "utf8");
	const updated = constantsSource.replace(
		/(Constants\.version\s*=\s*)"[^"]+"/,
		`$1"${nextVersion}"`
	);
	if (updated === constantsSource) {
		console.error("Não foi possível atualizar Constants.version em src/constants.js");
		process.exit(1);
	}
	fs.writeFileSync(CONSTANTS_PATH, updated);

	console.log(`Versão: ${currentVersion} → ${nextVersion}`);
	console.log("Atualizados: package.json, src/constants.js");
	console.log("\nPróximos passos:");
	console.log(`  npm test`);
	console.log(`  git commit -am "chore: release ${nextVersion}"`);
	console.log(`  git tag v${nextVersion} && git push origin main --follow-tags`);
};

main();
