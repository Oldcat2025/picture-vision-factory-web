/* ══ pages-c.js: ④素材资产库组(2页) + ⑤生成台账组(3页) ══ */

// ④ 素材资产库组
page('asset-gallery', {
  roles: ['*'],
  spec: {
    q: '资产画廊：跨模块复用发现，网格卡片视图',
    acts: ['按SKU/模块/类型筛选','点击卡片查看详情','引用到当前任务'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generated_assets'],
    limits: ['分页50条/页，支持图片懒加载']
  },
  guide: [
    '画廊卡片右上角<b>通道角标</b>（桌面版/shop_square等）帮助快速识别适配渠道',
    '"可复用"标签表示该资产可被其他SKU引用；"定制"表示绑定特定SKU',
    '点击卡片跳转详情页，查看完整元数据与引用记录'
  ],
  body: async function(){
    var r = await L4.fetch('assets.list', {limit: 50});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var items = (r.data || []).map(function(a){
      return {
        sku: a.id || '-',
        mkt: a.market || '-',
        module: a.module || '-',
        type: a.image_type || '-',
        time: String(a.generated_at || '-').slice(0,16),
        reusable: !!a.reusable_flag,
        channel: a.channel || '',
        go: '#asset-detail',
        thumb: ''
      };
    });
    return toolbar(
      [
        inp('搜索 SKU / 资产ID...'),
        sel('模块',['全部','模块A场景模特图','模块B Listing','模块C TikTok','模块D主图','模块E TEMU','模块F A+','模块G图案']),
        sel('图片类型',['全部','场景图','模特图','主图','详情图','图案']),
        sel('市场',['全部','US','GB','DE','FR','JP']),
        sel('通道',['全部','桌面版','手机版','shop_square','feed_vertical'])
      ],
      [btn('批量导出','btn--ghost'), btn('标记为可复用','btn--ghost')]
    ) +
    (items.length ? gallery(items) : ghost('暂无生成资产')) +
    '<p style="text-align:center;margin-top:16px;font-size:12.5px;color:var(--t-3)">共 '+
      items.length + ' 个资产 · 当前显示 1-' + Math.min(items.length, 50) +
      ' · <a href="#" style="color:var(--gr-600)">加载更多</a></p>';
  }
});

page('asset-detail', {
  roles: ['*'],
  spec: {
    q: '单个资产的完整元数据、引用记录、大图预览',
    acts: ['查看资产元数据','查看被引用记录','引用到新任务','下载原图'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generated_assets','tenant_oldcat.generation_ledger'],
    limits: ['storage_ref字段不直接暴露完整路径（安全）']
  },
  body: async function(){
    var r = await L4.fetch('assets.search', {limit: 1});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var a = (r.data || [])[0];
    if (!a) return callout('warn', '暂无资产', 'assets.search 未返回任何资产数据，请先生成资产');
    var reuse = a.reusable_flag ? chip('可复用','ok') : chip('定制','neutral');
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">'+
      '<div style="aspect-ratio:1;background:linear-gradient(135deg,var(--tint-100),var(--tint-50));border-radius:var(--r-card);'+
        'display:grid;place-items:center;border:1px solid var(--line);overflow:hidden">'+
        '<span class="ph-ico" style="font-size:48px;color:var(--t-3)">▣</span>'+
      '</div>'+
      panel('资产元数据', kv([
        ['资产ID','<span class="m">'+(a.id||'-')+'</span>'],
        ['模块',a.module||'-'],
        ['图片类型',a.image_type||'-'],
        ['市场',a.market||'-'],
        ['关联任务','<span class="m">'+(a.task_id||'-')+'</span>'],
        ['生成时间',String(a.generated_at||'-').slice(0,19)],
        ['可复用标记',reuse]
      ])) +
    '</div>' +
    panel('生成与存储参数', kv([
      ['effective_model',a.effective_model||'-'],
      ['quality',a.quality||'-'],
      ['aspect_ratio',a.aspect_ratio||'-'],
      ['storage_provider',a.storage_provider||'-'],
      ['storage_ref',a.storage_ref||'-']
    ])) +
    '<div class="btnrow">'+
      btn('引用到当前任务')+
      btn('下载原图','btn--ghost')+
      btn('查看生成任务详情','btn--ghost')+
    '</div>';
  }
});

// ⑤ 生成台账组
page('ledger-cost', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: '成本总览：按月聚合调用量、成本、失败率',
    acts: ['查看月度统计','按月对比趋势','识别异常峰值'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger'],
    limits: ['成本为估算值，精确账单见云厂商']
  },
  body: async function(){
    var r = await L4.fetch('ledger.summary', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    if (!rows.length) return ghost('暂无台账数据');
    var totalCalls = 0, totalCost = 0, totalOk = 0;
    rows.forEach(function(m){
      var c = Number(m.call_count) || 0;
      var ok = Number(m.success_count) || 0;
      totalCalls += c; totalOk += ok; totalCost += Number(m.total_cost_usd) || 0;
    });
    var failRate = totalCalls ? ((totalCalls - totalOk) / totalCalls * 100).toFixed(1) : '0.0';
    var avgCost = totalCalls ? (totalCost / totalCalls).toFixed(3) : '0.000';
    var sorted = rows.slice().sort(function(a,b){
      return (Number(b.total_cost_usd) || 0) - (Number(a.total_cost_usd) || 0);
    });
    var tr = sorted.map(function(m){
      var c = Number(m.call_count) || 0;
      var ok = Number(m.success_count) || 0;
      var cost = Number(m.total_cost_usd) || 0;
      var share = totalCost ? (cost / totalCost * 100).toFixed(1) + '%' : '0%';
      var fr = c ? ((c - ok) / c * 100).toFixed(1) + '%' : '0%';
      return [m.module || '-', String(c), '$' + cost.toFixed(2), share, fr];
    });
    return stats([
      ['总调用次数', String(totalCalls), '跨模块累计', 'ok'],
      ['总成本', '$' + totalCost.toFixed(2), '估算值', 'ok'],
      ['平均单次成本', '$' + avgCost, '按调用数均摊', 'ok'],
      ['失败率', failRate + '%', '成功 ' + totalOk + ' 次', 'ok']
    ], 4) +
    panel('按模块成本聚合（台账汇总）', table(
      ['模块', '调用次数', '总成本', '成本占比', '失败率'],
      tr
    ), {note: '成本为按 model_registry 价目表估算值，精确账单见云厂商'});
  }
});

page('ledger-breakdown', {
  roles: ['系统管理员'],
  spec: {
    q: '按层级/模型拆分：回答"钱花在哪层"（01文档问题5核心诉求）',
    acts: ['查看Layer级别成本分布','查看模块×模型矩阵','下钻到具体调用'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger'],
    limits: ['实时聚合计算，无预计算缓存']
  },
  guide: [
    '按Layer拆分回答<b>"哪层最贵"</b>：Layer2生图引擎通常占70%+成本',
    '按模块×模型拆分识别<b>降级路由频率</b>：GPT列非零说明发生了Gemini→GPT降级',
    '点击单元格数字可下钻到该维度的具体调用记录'
  ],
  body: async function(){
    var r = await L4.fetch('ledger.list', {limit: 50});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    if (!rows.length) return ghost('暂无台账数据');
    var totalCalls = 0, totalCost = 0;
    rows.forEach(function(m){
      totalCalls += Number(m.call_count) || 0;
      totalCost += Number(m.total_cost_usd) || 0;
    });
    var sorted = rows.slice().sort(function(a,b){
      return (Number(b.total_cost_usd) || 0) - (Number(a.total_cost_usd) || 0);
    });
    var tr = sorted.map(function(m){
      var c = Number(m.call_count) || 0;
      var ok = Number(m.success_count) || 0;
      var cost = Number(m.total_cost_usd) || 0;
      var share = totalCost ? (cost / totalCost * 100).toFixed(1) + '%' : '0%';
      var fr = c ? ((c - ok) / c * 100).toFixed(1) + '%' : '0%';
      var avg = c ? Math.round((Number(m.total_duration_ms) || 0) / c) + 'ms' : '-';
      return [m.module || '-', String(c), '$' + cost.toFixed(2), share, fr, avg];
    });
    return panel('按模块拆分（台账明细）', table(
      ['模块', '调用次数', '总成本', '成本占比', '失败率', '平均耗时'],
      tr
    ), {note: '共 ' + totalCalls + ' 次调用 · 总成本 $' + totalCost.toFixed(2) + ' · 数据来自 generation_ledger 实时聚合'});
  }
});

page('ledger-failure', {
  roles: ['系统管理员'],
  spec: {
    q: '失败率与重试分析：按模块/层级下钻，展示error_message样例',
    acts: ['识别高失败率模块','查看错误信息样例','触发批量重试'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger'],
    limits: ['只展示最近7天失败记录']
  },
  body: async function(){
    var rf = await L4.fetch('ledger.list', {status: 'failed', limit: 50});
    if (!rf.success) return callout('warn', '数据加载失败', rf.error || '未知错误');
    var failed = rf.data || [];
    if (!failed.length) return ghost('暂无失败记录');
    var rs = await L4.fetch('ledger.summary', {});
    var totals = (rs.success ? (rs.data || []) : []);
    var totalByModule = {};
    totals.forEach(function(m){ totalByModule[m.module] = Number(m.call_count) || 0; });
    var totalFailed = 0, failedCost = 0, totalAll = 0;
    failed.forEach(function(m){
      totalFailed += Number(m.call_count) || 0;
      failedCost += Number(m.total_cost_usd) || 0;
    });
    totals.forEach(function(m){ totalAll += Number(m.call_count) || 0; });
    var overallRate = totalAll ? (totalFailed / totalAll * 100).toFixed(1) + '%' : '-';
    var sorted = failed.slice().sort(function(a,b){
      return (Number(b.call_count) || 0) - (Number(a.call_count) || 0);
    });
    var tr = sorted.map(function(m){
      var c = Number(m.call_count) || 0;
      var all = totalByModule[m.module] || 0;
      var rate = all ? (c / all * 100).toFixed(1) + '%' : '-';
      return [m.module || '-', String(all), String(c), rate, '$' + (Number(m.total_cost_usd) || 0).toFixed(2)];
    });
    return stats([
      ['失败记录数', String(totalFailed), '跨模块聚合', 'warn'],
      ['整体失败率', overallRate, '失败 / 总调用', 'warn'],
      ['失败成本', '$' + failedCost.toFixed(2), '估算值', 'warn'],
      ['涉及模块', String(failed.length), '有失败记录的模块', 'warn']
    ], 4) +
    panel('按模块失败率排行', table(
      ['模块', '总调用', '失败次数', '失败率', '失败成本'],
      tr
    ), {note: '仅聚合 status=FAILED 的台账记录；重试 / error_message 明细下钻待接入'}) +
    '<div class="btnrow">' + btn('批量重试失败任务', 'btn--ghost') + btn('导出错误日志CSV', 'btn--ghost') + '</div>';
  }
});

/* ══ 注册完整性自检 ══
   ④ 素材资产库组: asset-gallery, asset-detail (2)
   ⑤ 生成台账组: ledger-cost, ledger-breakdown, ledger-failure (3)
   共5页 ✓ */
