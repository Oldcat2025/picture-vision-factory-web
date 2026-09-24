/* 用法: node bump-asset-version.js <版本号>
   把 index.html 里静态资源（app.css / core.js / pages-*.js）的 ?v= 统一改成新版本号。

   为什么需要这个脚本：这些资源 URL 的版本号不更新时，浏览器会一直复用缓存副本，
   前端改动明明上线了、打开却还是旧界面（2026-09-24 实际踩到，刷新一次才对）。
   约定：每次前端推 GitHub 前先跑一次，参数用本次的短提交哈希或日期串。 */
const fs = require('node:fs'), path = require('node:path');
const f = path.join(__dirname, 'index.html');
const v = String(process.argv[2] || Date.now()).trim();
if (!v) { console.error('usage: node bump-asset-version.js <version>'); process.exit(1); }
let s = fs.readFileSync(f, 'utf8');
const before = s;
s = s.replace(/(href="app\.css)(\?v=[^"]*)?(")/, '$1?v=' + v + '$3');
s = s.replace(/(src="(?:core|pages-[a-z])\.js)(\?v=[^"]*)?(")/g, '$1?v=' + v + '$3');
if (s !== before) fs.writeFileSync(f, s);
const hits = (s.match(/\?v=/g) || []).length;
console.log(JSON.stringify({ file: f, version: v, changed: s !== before, versionedRefs: hits }));
