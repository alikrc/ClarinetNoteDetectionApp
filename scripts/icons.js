// icon.svg'den PNG simgeleri üretir: web manifest (192/512, maskable), Play Store (512)
// Android başlatıcı simgeleri (eski tip, yuvarlak, uyarlanabilir ön plan), iOS simgesi ve açılış ekranı.
// Kullanım: npm run icons  (icon.svg değişince yeniden çalıştır, çıktılar depoya girer)
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const RES = path.join(ROOT, "android/app/src/main/res");
const BG = "#1C5B59";

// icon.svg'deki klarnet çizimi (arka plan dikdörtgeni hariç)
const svg = fs.readFileSync(path.join(ROOT, "icon.svg"), "utf8");
const art = svg.replace(/^[\s\S]*?<rect[^>]*\/>/, "").replace(/<\/svg>\s*$/, "");
// Çizimi (176..336 × 70..450) merkeze alıp s oranında küçültür
const scaled = s => `<g transform="translate(256 256) scale(${s}) translate(-256 -260)">${art}</g>`;
const wrap = (body, bg) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg || ""}${body}</svg>`);

const SQUARE = wrap(scaled(1), `<rect width="512" height="512" fill="${BG}"/>`);           // Play Store: köşeleri Play yuvarlar
const ROUNDED = fs.readFileSync(path.join(ROOT, "icon.svg"));                                // eski tip başlatıcı simgesi
const CIRCLE = wrap(scaled(0.78), `<circle cx="256" cy="256" r="256" fill="${BG}"/>`);
const MASKABLE = wrap(scaled(0.8), `<rect width="512" height="512" fill="${BG}"/>`);         // %80 güvenli alan
const FOREGROUND = wrap(scaled(0.74));                                                       // 108dp tuvalde 66dp güvenli alan

const png = (src, size, out) => {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  return sharp(src, { density: 384 }).resize(size, size).png().toFile(out);
};

// iOS: köşesiz, saydamsız 1024 px simge (köşeleri sistem yuvarlar); açılış ekranı açık zemin + ortada küçük simge
const IOS = path.join(ROOT, "ios/App/App/Assets.xcassets");
const SPLASH = wrap(`<g transform="translate(256 256) scale(0.14) translate(-256 -256)">${fs.readFileSync(path.join(ROOT, "icon.svg"), "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>`, `<rect width="512" height="512" fill="#ECEFEE"/>`);

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const jobs = [
    png(ROUNDED, 192, path.join(ROOT, "icons/icon-192.png")),
    png(ROUNDED, 512, path.join(ROOT, "icons/icon-512.png")),
    png(MASKABLE, 512, path.join(ROOT, "icons/icon-maskable-512.png")),
    png(SQUARE, 512, path.join(ROOT, "store/play-icon-512.png")),
  ];
  for(const [d, k] of Object.entries(DENSITIES)){
    const dir = path.join(RES, "mipmap-" + d);
    jobs.push(png(ROUNDED, 48 * k, path.join(dir, "ic_launcher.png")));
    jobs.push(png(CIRCLE, 48 * k, path.join(dir, "ic_launcher_round.png")));
    jobs.push(png(FOREGROUND, 108 * k, path.join(dir, "ic_launcher_foreground.png")));
  }
  if(fs.existsSync(IOS)){
    jobs.push(png(SQUARE, 1024, path.join(IOS, "AppIcon.appiconset/AppIcon-512@2x.png")));
    for(const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"])
      jobs.push(png(SPLASH, 2732, path.join(IOS, "Splash.imageset", f)));
  }
  await Promise.all(jobs);
  console.log(`${jobs.length} simge üretildi`);
})();
