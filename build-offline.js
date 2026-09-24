/* ══ build-offline.js: 把 prototype/ 打包成脱机单文件 HTML ══
   产物: ../视觉图片生成工厂管理系统-原型脱机版-v1.1.html
   做法:
   1. 读 index.html / app.css / core.js / pages-a~d.js
   2. 替换 Unsplash 外链缩略图为内联 data-URI SVG 占位图(离线可看)
   3. CSS 内联进 <style>, JS 内联进 <script>, 去掉外部引用
   4. 末尾注入构建标记
   运行: node build-offline.js  (在 prototype/ 目录下)
*/
var fs = require('fs');
var path = require('path');

var dir = __dirname;
function rd(f){ return fs.readFileSync(path.join(dir, f), 'utf8'); }

var html = rd('index.html');
var css  = rd('app.css');
var core = rd('core.js');
var pa   = rd('pages-a.js');
var pb   = rd('pages-b.js');
var pc   = rd('pages-c.js');
var pd   = rd('pages-d.js');

/* ── 1. 外链缩略图 -> 内联 SVG 占位图 ──
   按 SKU 名生成带品类图标+渐变底的占位图, 离线/无网环境完全自包含 */
var PALETTES = {
  'VASE':     ['#B8A78E','#E9E2D5'],
  'LAMP':     ['#D9B98A','#F3E9D8'],
  'CLOCK':    ['#8E9AAF','#DBE2EF'],
  'ORGANIZER':['#A3B18A','#DAD7CD'],
  'PLANTER':  ['#7A8B6F','#E3ECE1'],
  'STORAGE':  ['#9C8AA5','#E8E2EE'],
  'MIRROR':   ['#94A7B7','#E4EBF1'],
  'CANDLE':   ['#C9A66B','#F5EBDD'],
  'BASKET':   ['#C8A165','#F1E4CF'],
  'TRAY':     ['#AD8B70','#EBDFD2'],
  'SHELF':    ['#8E9E82','#E0E7DA'],
  'DEFAULT':  ['#AEB6BC','#E7EAEC']
};
var ICONS = {
  'VASE':' vase silhouette', 'LAMP':' lamp', 'CLOCK':' clock face',
  'ORGANIZER':' storage box', 'PLANTER':' planter with plant', 'MIRROR':' mirror',
  'CANDLE':' candle', 'BASKET':' woven basket', 'TRAY':' serving tray',
  'SHELF':' wall shelf', 'DEFAULT':' product image'
};

function placeholderSvg(sku){
  var key = 'DEFAULT';
  var m = (sku||'').match(/([A-Z]+)\d*$/);
  if (m && PALETTES[m[1]]) key = m[1];
  var c1 = PALETTES[key][0], c2 = PALETTES[key][1];
  var label = (sku && sku !== '-') ? sku : 'Pattern Design';
  var iconText = ICONS[key] || ICONS.DEFAULT;
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">'+
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'+
    '<stop offset="0" stop-color="'+c2+'"/><stop offset="1" stop-color="'+c1+'"/>'+
    '</linearGradient></defs>'+
    '<rect width="400" height="300" fill="url(#g)"/>'+
    '<circle cx="200" cy="128" r="52" fill="rgba(255,255,255,.55)"/>'+
    '<circle cx="200" cy="128" r="52" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.5"/>'+
    '<path d="M182 128 l12 12 24 -24" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<text x="200" y="208" text-anchor="middle" font-family="Arial" font-size="15" font-weight="600" fill="rgba(0,0,0,.55)">'+label+'</text>'+
    '<text x="200" y="230" text-anchor="middle" font-family="Arial" font-size="11" fill="rgba(0,0,0,.38)">'+iconText+' · demo image</text>'+
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* 收集画廊数据里的 SKU 顺序, 按出现顺序替换 URL */
var allJs = core + '\n' + pa + '\n' + pb + '\n' + pc + '\n' + pd;
var urlRe = /https:\/\/images\.unsplash\.com\/photo-[a-z0-9-]+\?[^"']*/g;

/* 从 pages-c.js 里逐条扫描 thumb 与大图, 关联它附近的 SKU 文本 */
var urls = [];
var m2;
var pcScanned = pc.replace(/thumb:'(https:\/\/images\.unsplash\.com\/[^']+)'/g, function(_, url){
  urls.push(url); return 'thumb:__PH__'+(urls.length-1)+'__';
});
/* asset-detail 大图: src="https://..." style=... */
pcScanned = pcScanned.replace(/src="(https:\/\/images\.unsplash\.com\/[^"]+)"/g, function(_, url){
  urls.push(url); return 'src=__PH__'+(urls.length-1)+'__"';
});

/* 按每条 URL 在原文中的上下文找最近的 SKU-XXX 提取品类关键词 */
function skuNear(text, idx){
  var before = text.slice(Math.max(0, idx-400), idx);
  var m = before.match(/SKU-([A-Z]+)-?\d*/g);
  return m && m.length ? m[m.length-1] : '';
}
var placeholders = urls.map(function(url){
  var at = pc.indexOf(url);
  return placeholderSvg(skuNear(pc, at));
});
/* 还原: 每个占位标记换回 data URI */
pcScanned = pcScanned.replace(/__PH__(\d+)__/g, function(_, i){
  return "'" + placeholders[+i] + "'";
});
/* src= 形式的引号处理: 上面替换带单引号, src= 需要的是双引号包裹 -> 修正 */
pcScanned = pcScanned.replace(/src='(data:image[^']+)'/g, 'src="$1"');

/* ── 2. 组装单文件 ── */
var jsAll = pcScanned;
/* core/pa/pb/pd 无外链, 原样拼 */
jsAll = core + '\n' + pa + '\n' + pb + '\n' + jsAll + '\n' + pd;

var out = html
  .replace('<link rel="stylesheet" href="app.css">', '<style>\n' + css + '\n/* offline build: thumbs replaced with inline SVG */\n</style>')
  .replace('<script src="core.js"></script>', '')
  .replace('<script src="pages-a.js"></script>', '')
  .replace('<script src="pages-b.js"></script>', '')
  .replace('<script src="pages-c.js"></script>', '')
  .replace('<script src="pages-d.js"></script>', '')
  .replace('<script>BOOT();</script>', '<script>\n' + jsAll + '\nBOOT();\n</script>');

/* 标题与构建标记 */
var stamp = new Date().toISOString().slice(0,10);
out = out.replace('<title>视觉图片生成工厂管理系统 - 低保真原型 v0.1</title>',
  '<title>视觉图片生成工厂管理系统 - 原型脱机演示版 v1.1</title>');
out = out.replace('<div class="pagefoot">原型仅用于确认信息架构与页面职责 · 数据均为假 · 不连接 n8n / Postgres</div>',
  '<div class="pagefoot">脱机演示版 v1.1 · '+stamp+' 构建 · 原型仅用于确认信息架构与页面职责 · 数据均为假 · 不连接任何服务器 · 可直接双击打开</div>');

var outFile = path.join(dir, '..', '视觉图片生成工厂管理系统-原型脱机版-v1.1.html');
fs.writeFileSync(outFile, out, 'utf8');

/* ── 3. 自检 ── */
var sizeKB = Math.round(fs.statSync(outFile).size / 1024);
var residual = (out.match(/https?:\/\/(?!www\.w3\.org)[a-z0-9.-]+\//gi) || []).filter(function(u){
  /* 允许 w3.org (SVG ns) 与 data: URI; 其他 http 外链都算残留 */
  return !/w3\.org/.test(u);
});
console.log('OK  ' + path.basename(outFile) + '  ' + sizeKB + ' KB');
console.log('外链缩略图替换数: ' + urls.length);
console.log('残留外部http引用: ' + (residual.length ? residual.join(', ') : '无'));
if (residual.length) process.exit(1);
