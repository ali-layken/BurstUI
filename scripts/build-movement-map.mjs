// Builds the single-file Movement Map page from the vendor/movement-map submodule into public/movement-map/index.html,
// which src/pages/movement-map.astro embeds as an iframe. The output is generated and git-ignored; fixes to the map
// live in the movement-map repo and reach this site by bumping the submodule (see README, "Movement Map").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sub = path.join(root, "vendor/movement-map");
if (!fs.existsSync(path.join(sub, "tools/bundle.mjs"))) {
  console.error("vendor/movement-map is empty. Run: git submodule update --init vendor/movement-map");
  process.exit(1);
}
execFileSync(process.execPath, [path.join(sub, "tools/bundle.mjs"), path.join(root, "public/movement-map/index.html")], { stdio: "inherit" });
