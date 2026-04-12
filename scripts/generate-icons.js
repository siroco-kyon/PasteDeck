// === アイコン生成スクリプト ===
// 何をする部分か：SVGデザインから全プラットフォーム向けアイコンを生成
// なぜ必要か：Electron アプリに必要な ICO / PNG / ICNS を一括作成するため

const sharp = require('sharp');
const { imagesToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const resourcesDir = path.join(__dirname, '..', 'resources');

// ==============================
// アイコン SVG デザイン（512x512）
// PasteDeck: カードが重なったクリップボード
// ==============================
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- メインの青グラデーション -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#42A5F5"/>
    </linearGradient>
    <!-- カードのシャドウ -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.25"/>
    </filter>
    <!-- 内側のグロー -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04"/>
    </linearGradient>
  </defs>

  <!-- 背景の丸角正方形 -->
  <rect width="512" height="512" rx="110" ry="110" fill="url(#bgGrad)"/>

  <!-- 奥のカード（薄め） -->
  <rect x="158" y="105" width="240" height="290" rx="22" ry="22"
        fill="white" fill-opacity="0.15" transform="rotate(-8, 256, 256)"/>

  <!-- 中のカード -->
  <rect x="148" y="112" width="240" height="290" rx="22" ry="22"
        fill="white" fill-opacity="0.25" transform="rotate(-3, 256, 256)"/>

  <!-- メインカード（白） -->
  <rect x="136" y="118" width="240" height="292" rx="22" ry="22"
        fill="white" filter="url(#shadow)"/>
  <!-- カード内グロー -->
  <rect x="136" y="118" width="240" height="292" rx="22" ry="22"
        fill="url(#cardGrad)"/>

  <!-- クリップ部分（上部） -->
  <rect x="214" y="100" width="84" height="44" rx="10" ry="10"
        fill="#1976D2"/>
  <rect x="228" y="110" width="56" height="24" rx="6" ry="6"
        fill="white" fill-opacity="0.9"/>

  <!-- コンテンツライン -->
  <rect x="168" y="198" width="176" height="14" rx="7" ry="7" fill="#42A5F5" fill-opacity="0.75"/>
  <rect x="168" y="226" width="140" height="12" rx="6" ry="6" fill="#90CAF9" fill-opacity="0.6"/>
  <rect x="168" y="252" width="156" height="12" rx="6" ry="6" fill="#90CAF9" fill-opacity="0.6"/>

  <!-- 区切り線 -->
  <rect x="168" y="282" width="176" height="2" rx="1" ry="1" fill="#E3F2FD" fill-opacity="0.8"/>

  <!-- タグ風の小チップ -->
  <rect x="168" y="300" width="58" height="20" rx="10" ry="10" fill="#1976D2" fill-opacity="0.15"/>
  <rect x="234" y="300" width="50" height="20" rx="10" ry="10" fill="#1976D2" fill-opacity="0.15"/>

  <!-- コピーアイコン（右下） -->
  <circle cx="376" cy="392" r="46" fill="#1976D2"/>
  <rect x="355" y="371" width="24" height="30" rx="5" ry="5" fill="white" fill-opacity="0.6"/>
  <rect x="363" y="363" width="24" height="30" rx="5" ry="5" fill="white"/>
</svg>
`;

// ==============================
// トレイアイコン SVG（32x32 向け・シンプル版）
// ==============================
const traySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#42A5F5"/>
    </linearGradient>
  </defs>
  <!-- 背景 -->
  <rect width="32" height="32" rx="7" ry="7" fill="url(#bg)"/>
  <!-- 奥のカード -->
  <rect x="9" y="7" width="15" height="18" rx="2.5" ry="2.5"
        fill="white" fill-opacity="0.2" transform="rotate(-6, 16, 16)"/>
  <!-- メインカード -->
  <rect x="8" y="8" width="15" height="18" rx="2.5" ry="2.5" fill="white"/>
  <!-- クリップ -->
  <rect x="12" y="5.5" width="6" height="4" rx="1.5" ry="1.5" fill="#1976D2"/>
  <!-- ライン -->
  <rect x="10.5" y="14" width="10" height="1.5" rx="0.75" fill="#42A5F5" fill-opacity="0.7"/>
  <rect x="10.5" y="17" width="8"  height="1.5" rx="0.75" fill="#90CAF9" fill-opacity="0.6"/>
  <!-- コピーアイコン -->
  <circle cx="23" cy="24" r="5" fill="#1976D2"/>
  <rect x="20.5" y="21.5" width="3" height="3.5" rx="0.7" fill="white" fill-opacity="0.6"/>
  <rect x="21.5" y="20.5" width="3" height="3.5" rx="0.7" fill="white"/>
</svg>
`;

async function generateIcons() {
  console.log('アイコン生成を開始します...');

  // --- 512x512 PNG（Linux / ベース用） ---
  const png512Buffer = await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png512Buffer);
  console.log('icon.png (512x512) 生成完了');

  // --- Windows ICO（16 / 32 / 48 / 256px マルチサイズ） ---
  // imagesToIco は { width, height, data: RawRGBABuffer } を期待する
  const icoSizes = [16, 32, 48, 256];
  const icoImages = await Promise.all(
    icoSizes.map(async size => {
      const { data } = await sharp(Buffer.from(iconSvg))
        .resize(size, size)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
      return { width: size, height: size, data };
    })
  );
  const icoBuffer = imagesToIco(icoImages);
  fs.writeFileSync(path.join(resourcesDir, 'icon.ico'), icoBuffer);
  console.log('icon.ico 生成完了');

  // --- トレイアイコン PNG（Linux / macOS 用） ---
  const tray32Buffer = await sharp(Buffer.from(traySvg))
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(resourcesDir, 'tray-icon-linux.png'), tray32Buffer);
  fs.writeFileSync(path.join(resourcesDir, 'tray-icon-mac.png'), tray32Buffer);
  console.log('tray-icon-linux.png / tray-icon-mac.png 生成完了');

  // --- Windows トレイアイコン ICO（16 / 32px） ---
  const trayIcoImages = await Promise.all(
    [16, 32].map(async size => {
      const { data } = await sharp(Buffer.from(traySvg))
        .resize(size, size)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
      return { width: size, height: size, data };
    })
  );
  const trayIcoBuffer = imagesToIco(trayIcoImages);
  fs.writeFileSync(path.join(resourcesDir, 'tray-icon-win.ico'), trayIcoBuffer);
  console.log('tray-icon-win.ico 生成完了');

  // --- ICNS（macOS アプリアイコン）---
  // macOS の ICNS は複数サイズを内包する独自フォーマット。
  // ここでは 512px PNG を icon.icns として配置（electron-builder が変換を担う）
  fs.writeFileSync(path.join(resourcesDir, 'icon.icns'), png512Buffer);
  console.log('icon.icns (PNG として配置、electron-builder がパッケージ時に変換) 生成完了');

  console.log('\n全アイコンの生成が完了しました！');
}

generateIcons().catch(err => {
  console.error('アイコン生成エラー:', err);
  process.exit(1);
});
