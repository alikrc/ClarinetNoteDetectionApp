// Yeni sürüm: sürüm numarasını her yerde birlikte yükseltir.
// - package.json "version"
// - sw.js önbellek adı (sol-klarnet-vN): eski önbellek temizlensin
// - Android: versionCode +1, versionName
// - iOS: CURRENT_PROJECT_VERSION +1, MARKETING_VERSION
// Kullanım: npm run release -- 1.1.0   (sürüm verilmezse son hane bir artar: 1.0.0 → 1.0.1)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const wr = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);

const pkg = JSON.parse(rd("package.json"));
const next = process.argv[2] || pkg.version.replace(/(\d+)$/, n => String(+n + 1));
if(!/^\d+\.\d+\.\d+$/.test(next)) { console.error("Sürüm biçimi: 1.2.3"); process.exit(1); }
pkg.version = next;
wr("package.json", JSON.stringify(pkg, null, 2) + "\n");

let sw = rd("sw.js"), cache;
sw = sw.replace(/const CACHE = "sol-klarnet-v(\d+)";/, (m, n) => (cache = `sol-klarnet-v${+n + 1}`, `const CACHE = "${cache}";`));
wr("sw.js", sw);

let gradle = rd("android/app/build.gradle"), code;
gradle = gradle.replace(/versionCode (\d+)/, (m, n) => (code = +n + 1, `versionCode ${code}`))
               .replace(/versionName "[^"]*"/, `versionName "${next}"`);
wr("android/app/build.gradle", gradle);

const PBX = "ios/App/App.xcodeproj/project.pbxproj";
let build = null;
if(fs.existsSync(path.join(ROOT, PBX))){
  let pbx = rd(PBX);
  pbx = pbx.replace(/CURRENT_PROJECT_VERSION = (\d+);/g, (m, n) => (build = +n + 1, `CURRENT_PROJECT_VERSION = ${build};`))
           .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${next};`);
  wr(PBX, pbx);
}
console.log(`Sürüm ${next} · ${cache} · Android versionCode ${code}` + (build ? ` · iOS build ${build}` : ""));
