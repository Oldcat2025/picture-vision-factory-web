/* ══ 项目29 原型 v0.1 · 内核：导航 / 渲染助手 / 路由 ══
   基于项目28 core.js 骨架改造：
   - 角色 3 个：运营 / 内容管理员 / 系统管理员
   - 顶部新增实例切换（只读展示，07文档§2.2.7：不开放一键切换高危操作）
   - 新增 gallery() 资产画廊卡片 / pal() 色板 / skiptag() 跳过态标签
   - ev() 证据徽章改为 F/U/M/I 四类（02文档§0.4证据溯源三要素）
*/

window.PAGES = {};

/* ─── L4-API 数据层（B5 联调：假数据 → 真实后端）─── */
var L4 = {
  /* 自动切换：本地 localhost 访问连本地 Docker n8n；部署到 Zeabur（任意域名）连生产 oldcat */
  base: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5678/webhook/l4-api'
    : 'https://oldcat.zeabur.app/webhook/l4-api',
  apiKey: 'l4-test-key-2026',
  async fetch(action, payload) {
    try {
      var r = await fetch(this.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
        body: JSON.stringify({ action: action, payload: payload || {} })
      });
      var j = await r.json();
      return j; // {success, data, error}
    } catch (e) {
      return { success: false, data: null, error: 'L4-API 连接失败: ' + e.message };
    }
  }
};

/* ─── 登录态（多用户 WEB 端登录 + 角色权限）─── */
function currentUser() {
  try { return JSON.parse(sessionStorage.getItem('vf_user') || 'null'); }
  catch (e) { return null; }
}
function setUser(u) { sessionStorage.setItem('vf_user', JSON.stringify(u)); }
function clearUser() { sessionStorage.removeItem('vf_user'); }

/* 角色：运营 / 内容管理员 / 系统管理员（开发运维不使用本前端，操作n8n后台） */
const ROLES = ['运营','内容管理员','系统管理员'];

/* ─── 导航树 ───
   items = [编号, 白话页名, 页面ID, 技术名（仅规格抽屉可见）] */
const NAV = [
  { g:'①', n:'1', t:'工作台', k:'dash', items:[
    ['1.1','我的待办','dash-todo','角色工作流总览 Role Dashboard'],
    ['1.2','跨模块任务概览','dash-overview','Pipeline Overview · 五层调用态势'],
    ['1.3','成本与生成速览','dash-cost-glance','Cost Glance · Ledger Summary'],
  ]},
  { g:'②', n:'2', t:'产品身份库', k:'pid', items:[
    ['2.1','SKU 检索浏览','pid-list','Product Identity List'],
    ['2.2','Product DNA 详情','pid-dna','Product DNA Detail · Layer 0 Output'],
    ['2.3','人群画像（COSMO）','pid-cosmo','COSMO Profile · Layer 1 Output'],
    ['2.4','竞品情报（SORFTIME）','pid-sorftime','SORFTIME Cache Viewer'],
  ]},
  { g:'③', n:'3', t:'生成任务', k:'task', items:[
    ['3.1','场景图生成','task-a-scene','Scene Images · Source 02'],
    ['3.2','模特图生成','task-a-model','Model Images · Source 02'],
    ['3.3','Listing全套图','task-b','Module B · Source 06'],
    ['3.4','TikTok全套图','task-c','Module C · Source 07'],
    ['3.5','主图合规器','task-d','Module D · Source 17-A'],
    ['3.6','TEMU详情图','task-e','Module E · Source 19'],
    ['3.7','A+页面设计','task-f','Module F · Source 22'],
    ['3.8','图案创意设计','task-g','Module G · Source 21 · 独立耦合'],
    ['3.9','任务流水线详情','task-pipeline','Run Detail · 跨层调用链'],
  ]},
  { g:'④', n:'4', t:'素材资产库', k:'asset', items:[
    ['4.1','资产画廊','asset-gallery','Generated Asset Gallery'],
    ['4.2','资产详情与引用','asset-detail','Asset Detail · Reuse Ledger'],
  ]},
  { g:'⑤', n:'5', t:'生成台账', k:'ledger', items:[
    ['5.1','成本总览','ledger-cost','Cost Overview · Ledger Aggregate'],
    ['5.2','按层级/模型拆分','ledger-breakdown','Layer / Model Breakdown'],
    ['5.3','失败率与重试分析','ledger-failure','Failure & Retry Analysis'],
  ]},
  { g:'⑥', n:'6', t:'配置中心', k:'cfg', items:[
    ['6.1','模特人设表（IA6）','cfg-ia6','IA6 Persona Config'],
    ['6.2','主题配置表','cfg-theme','Theme Config'],
    ['6.3','品牌黑名单','cfg-brand','Brand Blacklist'],
    ['6.4','市场语言映射','cfg-market-lang','Market Language Map'],
    ['6.5','敏感品类路由规则','cfg-sensitivity','Sensitivity Category Rules'],
    ['6.6','物理比例参照物','cfg-physical','Physical Reference Objects'],
  ]},
  { g:'⑦', n:'7', t:'系统设置', k:'sys', items:[
    ['7.1','多实例管理','sys-instance','Tenant Schema Registry'],
    ['7.2','凭证管理','sys-cred','Credential Registry（只显示引用）'],
    ['7.3','AI 模型与密钥','sys-model','Model Provider / Key Vault'],
    ['7.4','各环节用哪个模型','sys-binding','Model Profile Binding'],
    ['7.5','生图参数版本','sys-param','Image Gen Param Version'],
  ]},
  { g:'⑧', n:'8', t:'上线跟踪', k:'track', items:[
    ['8.1','上架登记','track-publish','Publication Registry'],
    ['8.2','实际表现数据','track-perf','Performance Weekly'],
    ['8.3','A/B测试记录','track-ab','AB Test Log'],
    ['8.4','优化建议与回测','track-backtest','Param Backtest'],
  ]},
  { g:'⑨', n:'9', t:'管理后台', k:'adm', items:[
    ['9.1','用户与权限','adm-user','App User / Role'],
    ['9.2','权限说明','adm-perm','Permission Matrix'],
    ['9.3','数据维护','adm-db','DB Maintenance'],
    ['9.4','操作记录','adm-audit','Audit Log'],
    ['9.5','系统对接','adm-integration','Integration · LLM Gateway'],
    ['9.6','用量与费用','adm-cost','Cost & Quota'],
  ]},
];

/* ═══ 渲染助手 ═══ */

function chip(t, tone){ return '<span class="chip chip--'+(tone||'neutral')+'">'+t+'</span>'; }

function table(cols, rows){
  var h = cols.map(function(c){ return '<th>'+c+'</th>'; }).join('');
  var b = rows.map(function(r){
    return '<tr>'+r.map(function(c){ return '<td>'+c+'</td>'; }).join('')+'</tr>';
  }).join('');
  return '<div class="tw"><table class="t"><thead><tr>'+h+'</tr></thead><tbody>'+b+'</tbody></table></div>';
}

function panel(title, inner, opt){
  opt = opt || {};
  var sub  = opt.sub  ? '<span class="sub">'+opt.sub+'</span>' : '';
  var note = opt.note ? '<div class="pnl__note">'+opt.note+'</div>' : '';
  var bd   = '<div class="pnl__bd'+(opt.flush?' flush':'')+'">'+inner+'</div>';
  return '<section class="pnl"><div class="pnl__hd"><h3>'+title+'</h3>'+sub+'</div>'+bd+note+'</section>';
}

function toolbar(filters, actions){
  return '<div class="tb"><div class="flt">'+filters.join('')+'</div>'+
         '<div class="btnrow" style="margin:0">'+actions.join('')+'</div></div>';
}
function sel(label, opts){
  return '<select class="sel"><option>'+label+'</option>'+
    (opts||[]).map(function(o){return '<option>'+o+'</option>';}).join('')+'</select>';
}
function inp(ph){ return '<input class="inp" placeholder="'+ph+'">'; }
function btn(t, cls){ return '<button class="btn '+(cls||'btn--ghost')+'">'+t+'</button>'; }

function kv(pairs){
  return '<dl class="kv">'+pairs.map(function(p){
    return '<dt>'+p[0]+'</dt><dd>'+p[1]+'</dd>';
  }).join('')+'</dl>';
}

function stats(items, n){
  return '<div class="stats s'+(n||items.length)+'">'+items.map(function(i){
    var tone = (i[3]||'').trim();
    return '<div class="st'+(tone?' st--'+tone:'')+'">'+
      '<div class="st__v'+(i[4]?' sm':'')+'">'+i[1]+'</div>'+
      '<div class="st__tx">'+
        '<div class="st__k">'+i[0]+'</div>'+
        (i[2]?'<div class="st__n">'+i[2]+'</div>':'')+
      '</div></div>';
  }).join('')+'</div>';
}

function steps(list){
  return '<div class="steps">'+list.map(function(s,i){
    return '<div class="step '+s[0]+'">'+
      '<div class="step__i">'+(i+1)+'</div>'+
      '<div class="step__b"><div class="step__t">'+s[1]+'</div>'+
        (s[2]?'<div class="step__m">'+s[2]+'</div>':'')+'</div>'+
      '<div class="step__r">'+(s[3]||'')+'</div></div>';
  }).join('')+'</div>';
}

function bar(pct, tone){
  return '<div class="bar'+(tone?' '+tone:'')+'"><i style="width:'+pct+'%"></i></div>';
}

function callout(kind, title, body){
  return '<div class="callout'+(kind?' '+kind:'')+'"><b>'+title+'</b><p>'+body+'</p></div>';
}

function fld(label, ctl, hint){
  return '<div class="fld"><label>'+label+'</label>'+ctl+
    (hint?'<div class="hint">'+hint+'</div>':'')+'</div>';
}
function txt(v, ro){ return '<input class="ctl" value="'+(v||'')+'"'+(ro?' readonly':'')+'>'; }
function pick(opts){ return '<select class="ctl">'+opts.map(function(o){return '<option>'+o+'</option>';}).join('')+'</select>'; }

function copybox(label, body, meter, actions, mono){
  return '<div class="copybox"><div class="copybox__hd">'+
    '<span class="lb">'+label+'</span>'+
    '<span class="rt"><span class="meter">'+meter+'</span>'+(actions||'')+'</span></div>'+
    '<div class="copybox__bd'+(mono?' mono':'')+'">'+body+'</div></div>';
}

function tabs(list){
  return '<div class="tabs2">'+list.map(function(t,i){
    return '<div class="tab2'+(i===0?' on':'')+'">'+t+'</div>';
  }).join('')+'</div>';
}

function ghost(t){ return '<div class="ghost">'+t+'</div>'; }

/* ─── 证据字母符号：F 可见事实 / U 用户声称 / M 市场推断 / I AI推断 ─── */
var EV_MAP = {
  F:['ev--f','可见事实（视觉识别直接可见）'],
  U:['ev--u','用户声称（运营手填字段）'],
  M:['ev--m','市场推断（SORFTIME/COSMO推导）'],
  I:['ev--i','AI推断（无直接证据，权威最低）']
};
function ev(letters){
  return '<span class="ev">'+String(letters).split('').filter(function(c){return EV_MAP[c];})
    .map(function(c){ return '<i class="'+EV_MAP[c][0]+'" title="'+EV_MAP[c][1]+'">'+c+'</i>'; })
    .join('')+'</span>';
}
function evLegend(){
  return '<div class="evleg">'+Object.keys(EV_MAP).map(function(c){
    return '<span><i class="'+EV_MAP[c][0]+'">'+c+'</i>'+EV_MAP[c][1].split('（')[0]+'</span>';
  }).join('')+'</div>';
}

/* ─── 横向流程图 ───
   nodes = [{t:标题, s:副标题, n:待办数, tone:'fail|warn|ok', go:'页面ID'}] */
function flow(nodes){
  return '<div class="flow">'+nodes.map(function(nd,i){
    var badge = (nd.n === undefined) ? '' :
      '<span class="fnode__b'+(nd.n>0?(' on'+(nd.tone?' '+nd.tone:'')):'')+'">'+nd.n+'</span>';
    var arrow = (i < nodes.length-1) ? '<div class="farrow">-></div>' : '';
    var go = nd.go ? ' onclick="location.hash=\''+nd.go+'\'"' : '';
    return '<div class="fnode'+(nd.go?' link':'')+'"'+go+'>'+
      '<div class="fnode__no">'+('0'+(i+1)).slice(-2)+'</div>'+
      '<div class="fnode__t">'+nd.t+'</div>'+
      '<div class="fnode__s">'+(nd.s||'')+'</div>'+
      badge+'</div>'+arrow;
  }).join('')+'</div>';
}

/* ─── 分段流程（大段包步骤）───
   phases = [{no, t, s, state:'done|now|wait|fail|skip', time, chip, steps:[[state,标题,说明,耗时]]}] */
function phaseFlow(phases){
  return '<div class="pf">'+phases.map(function(p){
    var body = p.steps.map(function(s,i){
      return '<div class="pstep '+s[0]+'">'+
        '<span class="pstep__i">'+(i+1)+'</span>'+
        '<span class="pstep__t">'+s[1]+'</span>'+
        '<span class="pstep__m">'+(s[2]||'')+'</span>'+
        '<span class="pstep__r">'+(s[3]||'')+'</span></div>';
    }).join('');
    return '<section class="phase '+p.state+'">'+
      '<div class="phase__hd">'+
        '<div class="phase__no">'+p.no+'</div>'+
        '<div class="phase__tx"><b>'+p.t+'</b><i>'+p.s+'</i></div>'+
        '<div class="phase__rt">'+(p.chip||'')+'<span class="phase__time">'+(p.time||'')+'</span></div>'+
      '</div><div class="phase__bd">'+body+'</div></section>';
  }).join('')+'</div>';
}

/* ─── 跳过态标签（07文档§4.2：区别于wait，避免误读为"卡住"） ─── */
function skiptag(t){ return '<span class="skiptag">'+(t||'已跳过 · 复用')+'</span>'; }

/* ─── 资产画廊卡片（07文档§4.1 + 需求4：缩略图）───
   items = [{sku, mkt, module, type, time, reusable, channel, go, thumb}]
   thumb 可选：图片URL或base64，未传时显示占位符 */
function gallery(items){
  return '<div class="gallery">'+items.map(function(a){
    var reuse = a.reusable
      ? '<span class="gcard__reuse">可复用</span>'
      : '<span class="gcard__reuse no">定制</span>';
    var ch = a.channel ? '<span class="gcard__ch-corner">'+a.channel+'</span>' : '';
    var go = a.assetId
      ? ' onclick="sessionStorage.setItem(\'vf_cur_asset\',\''+a.assetId+'\');location.hash=\''+(a.go||'#asset-detail')+'\'"'
      : (a.go ? ' onclick="location.hash=\''+a.go+'\'"' : '');
    var imgInner = a.thumb
      ? '<img src="'+a.thumb+'" alt="'+a.sku+'">'
      : (a.assetId
          ? '<img class="lazy-img" data-asset-id="'+a.assetId+'" src="" alt="'+a.sku+'">'
          : '<span class="ph-ico">▣</span>');
    return '<div class="gcard"'+go+'>'+
      '<div class="gcard__img">'+imgInner+ch+'</div>'+
      '<div class="gcard__bd">'+
        '<div class="gcard__l1"><span class="m">'+a.sku+'</span><span class="mkt">'+a.mkt+'</span></div>'+
        '<div class="gcard__l2">'+a.module+' · '+a.type+'</div>'+
        '<div class="gcard__l3"><span>'+a.time+'</span>'+reuse+'</div>'+
      '</div>'+
      '<button class="gcard__quote">引用到当前任务</button>'+
    '</div>';
  }).join('')+'</div>';
}

/* 懒加载缩略图：分批并发（4个一批）按 asset id 取完整图，避免 24 个并发 26MB 传输超时 */
async function lazyLoadThumbs(){
  var imgs = document.querySelectorAll('.lazy-img');
  var batch = [];
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    var id = img.getAttribute('data-asset-id');
    if (!id || img.dataset.loaded) continue;
    img.dataset.loaded = '1';
    batch.push({img: img, id: id});
  }
  var BATCH = 4;
  for (var b = 0; b < batch.length; b += BATCH) {
    var chunk = batch.slice(b, b + BATCH);
    await Promise.all(chunk.map(function(item){
      return L4.fetch('assets.get', {asset_id: item.id}).then(function(r){
        var d = r.data;
        var it = Array.isArray(d) ? d[0] : d;
        if (it && it.storage_ref) item.img.src = it.storage_ref;
      }).catch(function(){});
    }));
  }
}

/* 任务详情弹窗 */
function taskDetailModal(t){
  var fields = [
    ['任务ID','<span class="m">'+(t.id||'-')+'</span>'],
    ['SKU',t.sku||'-'],
    ['模块',t.module||'-'],
    ['层级',t.layer||'-'],
    ['状态',t.status||'-'],
    ['请求模型',t.requested_model||'-'],
    ['实际模型',t.effective_model||'-'],
    ['重试次数',t.retry_count!=null?t.retry_count:'-'],
    ['成本(USD)',t.cost_estimate_usd!=null?t.cost_estimate_usd:'-'],
    ['耗时(ms)',t.duration_ms!=null?t.duration_ms:'-'],
    ['错误信息',t.error_message||'无'],
    ['创建时间',String(t.created_at||'-').slice(0,19)]
  ];
  var rows = fields.map(function(f){ return '<tr><td style="padding:6px 8px;color:#888;white-space:nowrap">'+f[0]+'</td><td style="padding:6px 8px;word-break:break-all">'+f[1]+'</td></tr>'; }).join('');
  var html = '<div id="task-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999">'+
    '<div style="background:#fff;border-radius:12px;padding:20px;max-width:560px;width:92%;max-height:80vh;overflow:auto">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
    '<b>任务详情</b><button onclick="document.getElementById(\'task-modal\').remove()" style="border:none;background:none;font-size:18px;cursor:pointer">✕</button></div>'+
    '<table style="width:100%;border-collapse:collapse">'+rows+'</table></div></div>';
  var old = document.getElementById('task-modal');
  if (old) old.remove();
  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

/* ─── 色板小色块（DNA详情 color_system 可视化）─── */
function pal(colors){
  return '<span class="pal">'+colors.map(function(c){
    return '<i style="background:'+c+'" title="'+c+'"></i>';
  }).join('')+'</span>';
}

/* ─── 操作指引 ─── */
function guideBar(list){
  if (!list || !list.length) return '';
  return '<details class="guide" open><summary><b>怎么操作</b>'+
    '<span class="guide__n">'+list.length+' 步</span></summary><ol class="guide__ol">'+
    list.map(function(g){ return '<li>'+g+'</li>'; }).join('')+
    '</ol></details>';
}

function page(id, def){ window.PAGES[id] = def; }

/* ═══ 路由与外壳 ═══ */
var CUR  = 'dash-todo';
var ROLE = '系统管理员';

function findNav(id){
  for (var i=0;i<NAV.length;i++){
    var g = NAV[i];
    for (var j=0;j<g.items.length;j++){
      if (g.items[j][2] === id) return { g:g, it:g.items[j] };
    }
  }
  return null;
}

function allowed(def){
  if (!def || !def.roles) return true;
  return def.roles.indexOf(ROLE) >= 0 || def.roles.indexOf('*') >= 0;
}
function groupVisibleCount(g){
  return g.items.filter(function(it){ return allowed(window.PAGES[it[2]]); }).length;
}
function firstAllowedOf(g){
  for (var i=0;i<g.items.length;i++){
    if (allowed(window.PAGES[g.items[i][2]])) return g.items[i][2];
  }
  return g.items[0][2];
}

function renderTabs(cur){
  document.getElementById('groupTabs').innerHTML = NAV.map(function(g){
    var on  = (g === cur.g) ? ' on' : '';
    var vis = groupVisibleCount(g);
    var dot = (vis === 0) ? '<span class="dot">无权限</span>' : '';
    return '<div class="tab'+on+'" data-g="'+g.k+'">'+g.t+dot+'</div>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('.tab[data-g]'), function(el){
    el.onclick = function(){
      var k = el.getAttribute('data-g');
      for (var i=0;i<NAV.length;i++){
        if (NAV[i].k === k){ location.hash = firstAllowedOf(NAV[i]); return; }
      }
    };
  });
}

function renderSide(cur){
  var g = cur.g;
  document.getElementById('sideIco').textContent   = g.n;
  document.getElementById('sideTitle').textContent = g.t;
  document.getElementById('sideSub').textContent   =
    g.items.length + ' 个页面 · ' + ROLE + '可见 ' + groupVisibleCount(g);

  document.getElementById('sideNav').innerHTML = g.items.map(function(it, i){
    var def  = window.PAGES[it[2]] || {};
    var lock = allowed(def) ? '' : ' lock';
    var on   = (it[2] === CUR) ? ' on' : '';
    return '<div class="sitem'+on+lock+'" data-id="'+it[2]+'">'+
      '<span class="sitem__no">'+('0'+(i+1)).slice(-2)+'</span>'+
      '<span class="sitem__tx">'+it[1]+'</span>'+
      '<span class="sitem__ch">'+(lock?'🔒':'›')+'</span></div>';
  }).join('');

  Array.prototype.forEach.call(document.querySelectorAll('.sitem'), function(el){
    el.onclick = function(){
      if (el.classList.contains('lock')) return;
      location.hash = el.getAttribute('data-id');
    };
  });
}

function renderSpec(def, nv){
  var s = def.spec || {};
  var sec = function(t, inner){ return '<div class="sec"><h4>'+t+'</h4>'+inner+'</div>'; };
  var ul = function(arr, cls){
    if (!arr || !arr.length) return '<p style="color:var(--t-4)">-</p>';
    return '<ul>'+arr.map(function(x){ return '<li class="'+(cls||'')+'">'+x+'</li>'; }).join('')+'</ul>';
  };
  document.getElementById('specBody').innerHTML =
    sec('技术名（开发用）', '<p class="tech">'+(nv.it[3]||'-')+'</p>') +
    sec('这一页回答什么', '<p>'+(s.q||'-')+'</p>') +
    sec('可用角色', ul(def.roles||['*'])) +
    sec('关键动作', ul(s.acts)) +
    sec('调用工作流', ul(s.wf, 'r')) +
    sec('读表', ul(s.reads, 'db')) +
    sec('写表', ul(s.writes, 'db')) +
    sec('边界 / 硬约束', ul(s.limits, 'w'));
}

async function render(){
  var id = location.hash.replace('#','') || 'dash-todo';
  if (!window.PAGES[id]) id = 'dash-todo';
  CUR = id;
  var def = window.PAGES[id];
  var nv  = findNav(id);

  renderTabs(nv);
  renderSide(nv);

  var roles = (def.roles||['*']).map(function(r){
    return chip(r, r===ROLE ? 'ok' : 'neutral');
  }).join('');

  var head =
    '<div class="ph">' +
      '<div class="ph__crumb">'+nv.g.t+' <span>·</span> '+nv.it[0]+'</div>' +
      '<div class="ph__row"><div>' +
        '<div class="ph__t">'+nv.it[1]+'</div>' +
        '<div class="ph__q">'+((def.spec&&def.spec.q)||'')+'</div>' +
        '<div class="ph__roles">'+roles+'</div>' +
      '</div></div>' +
    '</div>';

  var body = allowed(def)
    ? guideBar(def.guide) + await def.body()
    : callout('stop', '你当前的角色（'+ROLE+'）看不到这一页',
        '本页只对 '+(def.roles||[]).join(' / ')+' 开放。这不只是把按钮藏起来--服务器会拒绝请求，数据库也有约束兜底。想对比不同角色看到什么，换右上角的角色。');

  document.getElementById('page').innerHTML = head + body;
  renderSpec(def, nv);
  window.scrollTo(0, 0);
  lazyLoadThumbs();
}

function updateAvatar(){
  var av = document.getElementById('avatar');
  if (!av) return; /* 防御性写法：即使DOM结构未来再变，也不整页崩溃 */
  var u = currentUser();
  if (u) {
    av.textContent = (u.user_name || u.role || '?').slice(0,1);
    av.title = u.user_name + ' · ' + u.role + '（点击退出登录）';
    av.style.cursor = 'pointer';
    av.onclick = function(){ clearUser(); location.reload(); };
  } else {
    av.textContent = ROLE.slice(0,1);
    av.title = '当前角色：'+ROLE;
  }
}

function BOOT(){
  var sp = document.getElementById('spec');
  var mk = document.getElementById('mask');
  var open = function(v){ sp.classList.toggle('open', v); mk.classList.toggle('on', v); };
  document.getElementById('specBtn').onclick = function(){ open(!sp.classList.contains('open')); };
  document.getElementById('specX').onclick   = function(){ open(false); };
  mk.onclick = function(){ open(false); };

  /* 登录态：未登录 → 显示登录遮罩 */
  var loginMask = document.getElementById('loginMask');
  var user = currentUser();
  if (user) {
    ROLE = user.role;
    loginMask.style.display = 'none';
  } else {
    loginMask.style.display = 'flex';
  }

  /* 登录按钮 */
  document.getElementById('loginBtn').onclick = async function(){
    var u = document.getElementById('loginUser').value.trim();
    var p = document.getElementById('loginPass').value;
    var err = document.getElementById('loginErr');
    if (!u || !p) { err.textContent = '请输入用户名和密码'; return; }
    err.textContent = '登录中…';
    var r = await L4.fetch('admin.user.login', { user_name: u, password: p });
    if (r.success && r.data && r.data.length > 0) {
      var info = r.data[0];
      setUser({ user_name: info.user_name, role: info.role });
      ROLE = info.role;
      loginMask.style.display = 'none';
      err.textContent = '';
      updateAvatar();
      render();
    } else {
      err.textContent = '用户名或密码错误';
    }
  };
  document.getElementById('loginPass').onkeydown = function(e){ if (e.key === 'Enter') document.getElementById('loginBtn').click(); };

  /* 角色切换下拉：角色由登录账号决定，禁用手动切换 */
  var roleSel = document.getElementById('roleSelect');
  if (roleSel){
    roleSel.innerHTML = ROLES.map(function(r){ return '<option value="'+r+'">'+r+'</option>'; }).join('');
    roleSel.value = ROLE;
    roleSel.disabled = true;
    roleSel.title = '角色由登录账号决定';
  }
  updateAvatar();

  window.onhashchange = render;
  render();
}
