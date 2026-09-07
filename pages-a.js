/* ══ pages-a.js: ①工作台组(3页) + ②产品身份库组(4页) ══ */

// ① 工作台组
page('dash-todo', {
  roles: ['*'],
  spec: {
    q: '按角色呈现待办：运营看SKU/任务，内容管理员看配置，系统管理员看异常',
    acts: ['查看待办清单','跳转对应页面处理'],
    wf: ['WF-29-L4-API（读取各角色待办汇总）'],
    reads: ['tenant_oldcat.product_identity','tenant_oldcat.generation_ledger','tenant_oldcat.generated_assets'],
    limits: ['角色隔离展示不同维度']
  },
  guide: [
    '右上角<b>角色切换</b>可对比不同角色看到的工作台',
    '点击统计卡片或表格行可跳转到对应详情页',
    '待办数字实时刷新（生产环境5min轮询）'
  ],
  body: async function(){
    var role = window.ROLE || '系统管理员';
    var [pr, tr] = await Promise.all([
      L4.fetch('product.list', {limit: 100}),
      L4.fetch('product.task', {limit: 100})
    ]);
    if (!pr.success || !tr.success) return callout('warn', '数据加载失败', pr.error || tr.error || '未知错误');
    var products = pr.data || [];
    var tasks = tr.data || [];
    var pendingSku = products.filter(function(p){
      var s = (p.identity || {}).dna_status;
      return s === 'PENDING' || s === 'ANALYZING';
    }).length;
    var failedTasks = tasks.filter(function(t){ return t.status === 'FAILED'; }).length;
    var inProgress = tasks.filter(function(t){
      return t.status !== 'SUCCESS' && t.status !== 'FAILED';
    }).length;
    var stTone = function(s){
      return s === 'SUCCESS' ? 'ok' : (s === 'FAILED' ? 'fail' : 'warn');
    };
    var taskRows = tasks.slice(0, 5).map(function(t){
      return [
        '<span class="m">'+String(t.id||'')+'</span>',
        t.sku || '-',
        t.module || '-',
        chip(t.status || '-', stTone(t.status)),
        String(t.created_at || '-').slice(0,16)
      ];
    });
    var taskTable = panel('近期任务', table(
      ['任务ID','SKU','模块','状态','提交时间'],
      taskRows.length ? taskRows : [['<span class="ghost">暂无任务数据</span>','','','','']]
    ));

    if (role === '运营') {
      return stats([
        ['待完成 SKU 资料', pendingSku, 'identity.dna_status 为 PENDING/ANALYZING', pendingSku > 0 ? 'warn' : 'ok'],
        ['进行中任务', inProgress, 'status 非 SUCCESS/FAILED', ''],
        ['失败任务', failedTasks, 'status==FAILED 需重试', failedTasks > 0 ? 'fail' : 'ok']
      ],3) + taskTable;
    }
    if (role === '内容管理员') {
      return stats([
        ['待完成 SKU 资料', pendingSku, 'identity.dna_status 为 PENDING/ANALYZING', pendingSku > 0 ? 'warn' : 'ok'],
        ['进行中任务', inProgress, 'status 非 SUCCESS/FAILED', ''],
        ['失败任务', failedTasks, 'status==FAILED 需重试', failedTasks > 0 ? 'fail' : 'ok']
      ],3) + taskTable;
    }
    return stats([
      ['失败任务（全部）', failedTasks, 'status==FAILED 需人工介入或重试', failedTasks > 0 ? 'fail' : 'ok'],
      ['进行中任务', inProgress, 'status 非 SUCCESS/FAILED', ''],
      ['待完成 SKU 资料', pendingSku, 'identity.dna_status 为 PENDING/ANALYZING', pendingSku > 0 ? 'warn' : 'ok']
    ],3) + taskTable;
  }
});

page('dash-overview', {
  roles: ['*'],
  spec: {
    q: '五层架构调用态势：Layer0→Layer1→7模块→Layer2，可视化任务分布',
    acts: ['查看各层活跃任务数','点击节点跳转详情'],
    wf: ['WF-29-L4-API（汇总统计）'],
    reads: ['tenant_oldcat.generation_ledger'],
    limits: ['实时快照非历史趋势']
  },
  body: async function(){
    var r = await L4.fetch('product.task', {limit: 200});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var tasks = r.data || [];
    if (!tasks.length) return ghost('暂无任务数据，先跑一次生成任务后回来查看');
    var layerCount = { 'LAYER0': 0, 'LAYER1_COSMO': 0, 'LAYER1_SORFTIME': 0, 'LAYER2': 0 };
    var bizCount = 0;
    tasks.forEach(function(t){
      var l = t.layer;
      if (layerCount.hasOwnProperty(l)) layerCount[l]++;
      var m = t.module || '';
      if (m && m !== 'LAYER0' && m !== 'LAYER1_COSMO' && m !== 'LAYER1_SORFTIME') bizCount++;
    });
    var layerChip = function(l){
      var name = (l === 'LAYER0') ? 'Layer0'
        : (l === 'LAYER1_COSMO' ? 'Layer1-COSMO'
        : (l === 'LAYER1_SORFTIME' ? 'Layer1-SORFTIME'
        : (l === 'LAYER2' ? 'Layer2' : (l || '-'))));
      return chip(name, 'sys');
    };
    var stTone = function(s){ return s === 'SUCCESS' ? 'ok' : (s === 'FAILED' ? 'fail' : 'warn'); };
    var rows = tasks.slice(0, 5).map(function(t){
      var tj = JSON.stringify(t).replace(/'/g, "&#39;");
      return [
        '<span class="m">'+String(t.id||'')+'</span>',
        t.sku || '-',
        t.module || '-',
        layerChip(t.layer),
        chip(t.status || '-', stTone(t.status)),
        String(t.created_at || '-').slice(0,16),
        '<button class="btn btn--ghost" style="padding:2px 10px" onclick="taskDetailModal(JSON.parse(this.getAttribute(\'data-t\')))" data-t=\''+tj+'\'>详情</button>'
      ];
    });
    return flow([
      {t:'Layer 0',s:'产品身份确认',n:layerCount.LAYER0,go:'pid-list'},
      {t:'Layer 1-COSMO',s:'人群画像',n:layerCount.LAYER1_COSMO,go:'pid-cosmo'},
      {t:'Layer 1-SORFTIME',s:'竞品情报',n:layerCount.LAYER1_SORFTIME,go:'pid-sorftime'},
      {t:'7个业务模块',s:'场景图/Listing/TikTok/...',n:bizCount,tone:'warn'},
      {t:'Layer 2',s:'统一生图引擎',n:layerCount.LAYER2,tone:'ok',go:'ledger-breakdown'}
    ]) + panel('最近活跃任务', table(
      ['任务ID','SKU','模块','当前层级','状态','开始时间','操作'],
      rows
    ));
  }
});

page('dash-cost-glance', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: '成本速览：今日/本月调用量、成本估算、失败率',
    acts: ['查看聚合统计','识别异常趋势'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger'],
    limits: ['只看估算值，精确账单见云厂商']
  },
  body: async function(){
    var ls = await L4.fetch('ledger.summary', {});
    if (!ls.success) return callout('warn', '数据加载失败', ls.error || '未知错误');
    var ledger = ls.data || [];
    if (!ledger.length) return ghost('暂无台账数据');
    var totalCalls = 0, totalCost = 0;
    ledger.forEach(function(m){
      totalCalls += Number(m.call_count) || 0;
      totalCost += Number(m.total_cost_usd) || 0;
    });
    var tk = await L4.fetch('product.task', {limit: 200});
    var tasks = (tk.success ? (tk.data || []) : []);
    var totalTasks = tasks.length;
    var failedTasks = tasks.filter(function(t){ return t.status === 'FAILED'; }).length;
    var failRate = totalTasks ? (failedTasks / totalTasks * 100).toFixed(1) + '%' : '0.0%';
    var avgCost = totalCalls ? (totalCost / totalCalls).toFixed(3) : '0.000';

    var order = ['LAYER0', 'LAYER1_COSMO', 'LAYER1_SORFTIME', 'LAYER2'];
    var layerAgg = {};
    order.forEach(function(l){ layerAgg[l] = {count: 0, cost: 0, dur: 0}; });
    tasks.forEach(function(t){
      var l = t.layer;
      if (!layerAgg[l]) return;
      layerAgg[l].count++;
      layerAgg[l].cost += Number(t.cost_estimate_usd) || 0;
      layerAgg[l].dur += Number(t.duration_ms) || 0;
    });
    var layerName = { 'LAYER0': 'Layer 0', 'LAYER1_COSMO': 'Layer 1-COSMO', 'LAYER1_SORFTIME': 'Layer 1-SORFTIME', 'LAYER2': 'Layer 2' };
    var layerRows = order.map(function(l){
      var a = layerAgg[l];
      var share = totalCost ? (a.cost / totalCost * 100).toFixed(1) + '%' : '0%';
      var avg = a.count ? Math.round(a.dur / a.count) + 'ms' : '-';
      return [layerName[l], String(a.count), '$' + a.cost.toFixed(2), share, avg];
    });

    return stats([
      ['总调用次数', String(totalCalls), '跨模块累计（ledger.summary）', 'ok'],
      ['总成本', '$' + totalCost.toFixed(2), '估算值', 'ok'],
      ['平均单次成本', '$' + avgCost, '按调用数均摊', 'ok'],
      ['失败率', failRate, '失败 ' + failedTasks + ' / 任务 ' + totalTasks, (totalTasks && failedTasks / totalTasks > 0.05) ? 'warn' : 'ok']
    ],4) + panel('按Layer分布', table(
      ['层级','调用次数','成本(估算)','成本占比','平均耗时'],
      layerRows
    ), {note: '层级分布按 product.task 实时聚合（ledger.summary 仅按 module 聚合，无 layer 维度）'}) +
    callout('','月度趋势','累计 ' + totalCalls + ' 次调用，总成本 $' + totalCost.toFixed(2) + '（按 generation_ledger 聚合估算，精确账单见云厂商）');
  }
});

// ② 产品身份库组
page('pid-list', {
  roles: ['*'],
  spec: {
    q: 'SKU库存与DNA状态总览，支持筛选与跳转详情',
    acts: ['搜索SKU','查看DNA状态','跳转详情页'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.product_identity','tenant_oldcat.product_dna'],
    limits: ['分页100条/页']
  },
  body: async function(){
    var r = await L4.fetch('product.list', {limit: 50});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var toneMap = {'APPROVED':'ok','ANALYZING':'run','PARTIAL':'warn','REJECT':'err','STALE':'warn'};
    var rows = (r.data||[]).map(function(item){
      var id = item.identity || {};
      var tid = item.thumbnail_ref || '';
      return [
        tid
          ? '<img src="'+tid+'?x-oss-process=image/resize,w_120" style="width:40px;height:40px;object-fit:cover;border-radius:6px;display:block" alt="">'
          : '<span class="ghost">-</span>',
        '<a href="#pid-dna" onclick="sessionStorage.setItem(\'vf_cur_pid\',\''+id.id+'\')" style="color:var(--gr-500);text-decoration:none">'+id.sku+'</a>',
        id.market || '-',
        chip(id.dna_status || '-', toneMap[id.dna_status] || 'neutral'),
        chip(id.product_category_track || 'GENERIC_PRODUCT', 'neutral'),
        id.ia12_coverage_type || 'NONE',
        (item.product_dna ? '1' : '0'),
        String(id.dna_analyzed_at || id.updated_at || '-').slice(0,16)
      ];
    });
    return toolbar(
      [inp('搜索 SKU / 品类...'), sel('市场',['US','GB','DE','FR','JP']), sel('DNA状态',['APPROVED','ANALYZING','PARTIAL'])],
      [btn('批量刷新DNA','btn--ghost',"window._todo('批量刷新DNA待接入')"), btn('导出CSV','btn--ghost',"window._exportCsv()")]
    ) + table(
      ['缩略图','SKU','市场','DNA状态','品类轨道','IA12覆盖','关联资产','最后更新'],
      rows.length ? rows : [['<span class="ghost">暂无产品数据，先跑一次数据准备流程</span>','','','','','','','']]
    );
  }
});

page('pid-dna', {
  roles: ['*'],
  spec: {
    q: 'Product DNA完整卡片：视觉识别、卖点列表、QC反查、IA12',
    acts: ['查看DNA详情','按证据类型筛选卖点','复核QC拒绝项','强制刷新（内容管理员+）'],
    wf: ['WF-29-L4-API','WF-29-L0'],
    reads: ['tenant_oldcat.product_dna'],
    writes: ['tenant_oldcat.product_dna（强制刷新时）'],
    limits: ['QC拒绝项需人工复核不可自动通过']
  },
  guide: [
    '卖点列表按<b>证据类型</b>分组：F可见事实(最高权威) > U用户声称 > M市场推断 > I AI推断',
    'QC拒绝的声明会红色标出，需人工确认是否编造',
    '强制刷新会清空缓存重新调用视觉识别（内容管理员/系统管理员权限）'
  ],
  body: async function(){
    var r = await L4.fetch('product.get', {product_identity_id:(sessionStorage.getItem('vf_cur_pid')||'9ad0a229-7bbe-4a41-899c-3e0c819e3f4d')});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var item = (r.data||[])[0] || null;
    var id = item ? (item.identity || {}) : {};
    var pd = item ? item.product_dna : null;
    window._curDna = pd;
    if (!pd) return callout('', '该 SKU 尚未跑 DNA 分析', '当前产品身份还没有生成 Product DNA 数据，请先在 Layer 0 数据准备流程中触发视觉识别与卖点提取。');

    var va = pd.visual_analysis || {};
    var cs = va.color_system || {};
    var pf = va.product_form || {};
    var sp = pd.selling_points || [];
    var rejected = pd.qc_rejected_claims || [];
    var qcTone = (pd.qc_result === 'APPROVE' || pd.qc_result === 'APPROVED') ? 'ok' : (pd.qc_result === 'REJECT' ? 'err' : 'warn');
    var join = function(arr){ return (arr && arr.length) ? arr.join(' · ') : '-'; };
    var chips = function(arr){ return (arr && arr.length) ? arr.map(function(x){ return chip(x,'neutral'); }).join(' ') : '-'; };

    var motifs = (va.motif_inventory||[]).map(function(m){
      return [m.name||'-', m.scale||'-', m.position||'-', (m.count!=null ? m.count : '-')];
    });
    var colorBar = (cs.primary_colors && cs.primary_colors.length) ? pal(cs.primary_colors) : '-';
    var spList = sp.length
      ? '<ul style="list-style:disc;padding-left:20px;font-size:13px;color:var(--t-2)">'+
        sp.map(function(s){
          var t = s.title_cn || s.title_local || s.title_en || '未命名卖点';
          var d = s.description_cn || '';
          return '<li style="margin-bottom:8px"><b>'+t+'</b>'+(d ? '<br><span style="color:var(--t-3)">'+d+'</span>' : '')+'</li>';
        }).join('')+'</ul>'
      : ghost('暂无卖点数据');
    var rejectCallout = rejected.length
      ? callout('stop', 'QC反查：'+rejected.length+' 条声明被拒绝', '<b>示例：</b>'+(rejected[0]||'')+'<br><b>处理建议：</b>从卖点池移除，或要求运营提供产品规格书人工确认')
      : '';

    return '<div class="cols c21">'+
      panel('SKU基础信息', kv([
        ['SKU','<span class="m">'+(id.sku||'-')+'</span>'],
        ['产品名', id.product_name || '-'],
        ['市场', id.market || '-'],
        ['品类轨道', chip(id.product_category_track || 'GENERIC_PRODUCT', 'neutral')],
        ['DNA状态', chip(id.dna_status || '-', 'neutral')],
        ['QC结果', chip(pd.qc_result || '-', qcTone)],
        ['QC模型', chip(pd.qc_model || '-', 'neutral')],
        ['最后更新', String(id.dna_analyzed_at || id.updated_at || '-').slice(0,16)]
      ])) +
      '<div>'+btn('强制刷新DNA（需权限）','btn--ghost',"window._todo('强制刷新DNA待接入')")+btn('查看原始JSON','btn--ghost',"window._showJson(window._curDna)")+'</div>'+
    '</div>' +
    panel('视觉分析（Visual Analysis）',
      '<h4 style="margin-bottom:10px">主视觉元素（Motif Inventory）</h4>'+
      table(['元素','尺度','位置','数量'],
        motifs.length ? motifs : [['<span class="ghost">暂无主视觉元素</span>','','','']]
      )+
      '<h4 style="margin:16px 0 10px">色彩系统</h4>'+
      '<p>主色：'+colorBar+' · 基调：'+(cs.palette_mood||'-')+' · 对比度：'+(cs.contrast_level||'-')+' · 关系：'+(cs.color_relationships||'-')+'</p>'+
      '<h4 style="margin:16px 0 10px">产品形态与工艺</h4>'+
      '<p><b>形态：</b>'+(pf.shape||'-')+' · <b>纹理工艺：</b>'+(va.texture_technique||'-')+'</p>'+
      '<p><b>工艺细节：</b>'+join(va.craft_details)+'</p>'+
      '<h4 style="margin:16px 0 10px">风格 / 情绪 / 季节</h4>'+
      '<p><b>艺术风格：</b>'+(va.art_style||'-')+'</p>'+
      '<p><b>家居风格：</b>'+chips(va.home_styles)+'</p>'+
      '<p><b>视觉情绪：</b>'+chips(va.visual_emotion)+'</p>'+
      '<p><b>季节标签：</b>'+chips(va.seasonal_tags)+'</p>'+
      '<p style="margin-top:12px;color:var(--t-3)"><b>线条质感：</b>'+(va.line_quality||'-')+'</p>'
    ) +
    panel('卖点列表（Selling Points）', spList) +
    rejectCallout;
  }
});

page('pid-cosmo', {
  roles: ['*'],
  spec: {
    q: 'COSMO人群画像：demographics + relation_triples社交关系网',
    acts: ['查看人群特征','浏览关系三元组'],
    wf: ['WF-29-L4-API','WF-29-L1-COSMO'],
    reads: ['tenant_oldcat.cosmo_profile'],
    limits: ['relation_type不做强枚举断言（04文档暂缓决策）']
  },
  body: async function(){
    var r = await L4.fetch('product.get', {product_identity_id:(sessionStorage.getItem('vf_cur_pid')||'9ad0a229-7bbe-4a41-899c-3e0c819e3f4d')});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var item = (r.data||[])[0] || null;
    var id = item ? (item.identity || {}) : {};
    var cp = item ? item.cosmo_profile : null;
    if (!cp) return callout('', '该 SKU 尚未跑 COSMO 分析', '当前产品身份还没有生成 COSMO 人群画像数据，请先在 Layer 1-COSMO 流程中触发人群分析。');

    var dem = cp.demographics || {};
    var rt = cp.relation_triples || [];
    var join = function(arr){ return (arr && arr.length) ? arr.join(' · ') : '-'; };
    var triples = rt.map(function(t){
      return [t.subject||'-', t.relation_type||'-', t.object||'-', '<span style="font-size:12px;color:var(--t-3)">'+(t.evidence||'-')+'</span>'];
    });

    return '<div class="cols c21">'+
      panel('SKU与画像概览', kv([
        ['SKU','<span class="m">'+(id.sku||'-')+'</span>'],
        ['产品名', id.product_name || '-'],
        ['市场', cp.market || id.market || '-'],
        ['画像模型', cp.model_used || '-'],
        ['生成时间', String(cp.generated_at || '-').slice(0,16)]
      ])) +
      '<div>'+btn('重新生成画像（需权限）','btn--ghost',"window._todo('重新生成画像待接入')")+'</div>'+
    '</div>' +
    panel('人群特征（Demographics）', kv([
      ['年龄段', dem.age_range || '-'],
      ['性别倾向', dem.gender || '-'],
      ['兴趣标签', join(dem.interests)],
      ['核心痛点', join(dem.pain_points)],
      ['使用场景', dem.use_scenario || '-']
    ])) +
    panel('社交关系三元组（Relation Triples）',
      '<p style="font-size:12.5px;color:var(--t-3);margin-bottom:12px">Subject → Relation → Object（证据来源）</p>'+
      table(
        ['Subject','Relation Type','Object','Evidence'],
        triples.length ? triples : [['<span class="ghost">暂无关系三元组</span>','','','']]
      ),
      {note:'<b>relation_type字段</b>当前不做枚举校验（02文档§2.1暂缓决策），保持自由文本以容纳未知关系类型'}
    );
  }
});

page('pid-sorftime', {
  roles: ['*'],
  spec: {
    q: 'SORFTIME竞品情报缓存：标题/价格/VOC/热搜词，展示新鲜度',
    acts: ['查看竞品数据','识别缓存过期提示'],
    wf: ['WF-29-L1-SORFTIME'],
    reads: ['tenant_oldcat.sorftime_cache'],
    limits: ['不展示raw_response原始字段（02契约）']
  },
  body: async function(){
    var r = await L4.fetch('product.sorftime', {limit: 10});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    if (!rows.length) return panel('竞品情报（SORFTIME Cache）', ghost('暂无竞品情报缓存，先跑一次 SORFTIME 抓取'))
      + callout('','缓存策略','SORFTIME数据默认7天有效期。过期后首次Layer1调用会触发MCP重新抓取（约30-60s），期间前端显示琥珀色"正在刷新"提示。');
    var item = rows[0];
    var nf = (item.normalized_fields && typeof item.normalized_fields === 'object') ? item.normalized_fields : {};
    var isFresh = item.ttl_expires_at && new Date(item.ttl_expires_at) > new Date();
    var fresh = isFresh
      ? '<span style="font-size:12px;color:var(--t-3)">缓存新鲜 · 抓取于 ' + String(item.fetched_at||'').slice(0,16) + '</span>'
      : '<span style="font-size:12px;color:var(--t-2)">缓存已过期 · 下次调用将重新抓取</span>';
    var kw = Array.isArray(item.hot_keywords) ? item.hot_keywords.join(' · ')
      : (typeof item.hot_keywords === 'object' && item.hot_keywords ? Object.keys(item.hot_keywords).join(' · ') : '-');
    return panel('竞品情报（SORFTIME Cache）',
      kv([
        ['竞品参考', item.competitor_ref || '-'],
        ['类型', item.ref_type || '-'],
        ['市场', item.market || '-'],
        ['标题', nf.title || '-'],
        ['价格', nf.price ? '$'+nf.price : '-'],
        ['评分', nf.rating || '-'],
        ['评论数', nf.review_count || '-'],
        ['VOC摘要', nf.voc_summary || '-'],
        ['热搜关键词', kw]
      ]) + fresh
    ) +
    callout('','缓存策略','SORFTIME数据默认7天有效期。过期后首次Layer1调用会触发MCP重新抓取（约30-60s），期间前端显示琥珀色"正在刷新"提示。');
  }
});

/* ══ 注册完整性自检 ══
   ① 工作台组: dash-todo, dash-overview, dash-cost-glance (3)
   ② 产品身份库组: pid-list, pid-dna, pid-cosmo, pid-sorftime (4)
   共7页 ✓ */
