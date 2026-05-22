import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// 1. Read new version from package.json
const pkgRaw = readFileSync(resolve(root, "package.json"), "utf-8");
const pkg = JSON.parse(pkgRaw);
const newVersion = pkg.version;
console.log(`Version from package.json: ${newVersion}`);

// 2. Update tauri.conf.json
const tauriConfPath = resolve(root, "src-tauri", "tauri.conf.json");
const tauriConfRaw = readFileSync(tauriConfPath, "utf-8");
const tauriConf = JSON.parse(tauriConfRaw);
const oldTauriVersion = tauriConf.version;
tauriConf.version = newVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`tauri.conf.json: ${oldTauriVersion} -> ${newVersion}`);

// 3. Update Cargo.toml (only in [package] section)
const cargoPath = resolve(root, "src-tauri", "Cargo.toml");
const cargoRaw = readFileSync(cargoPath, "utf-8");

// Find the [package] section boundaries
const packageStart = cargoRaw.indexOf("[package]");
const nextSectionMatch = cargoRaw.slice(packageStart + 9).match(/\n\[/);
const packageSectionEnd = nextSectionMatch
  ? packageStart + 9 + nextSectionMatch.index
  : cargoRaw.length;

const beforePackage = cargoRaw.slice(0, packageStart);
const packageSection = cargoRaw.slice(packageStart, packageSectionEnd);
const afterPackage = cargoRaw.slice(packageSectionEnd);

const versionRegex = /^version\s*=\s*"[^"]*"/m;
const match = packageSection.match(versionRegex);
if (!match) {
  console.error(
    "Error: Could not find version field in [package] section of Cargo.toml"
  );
  process.exit(1);
}

const oldLine = match[0];
const newLine = `version = "${newVersion}"`;
const updatedPackageSection = packageSection.replace(oldLine, newLine);
const updatedCargo = beforePackage + updatedPackageSection + afterPackage;

writeFileSync(cargoPath, updatedCargo);
console.log(`Cargo.toml [package]: ${oldLine} -> ${newLine}`);

console.log("Version sync complete.");
