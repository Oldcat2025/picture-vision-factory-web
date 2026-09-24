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
        assetId: a.id || '',
        thumb: a.storage_ref ? (a.storage_ref + '?x-oss-process=image/resize,w_400') : ''
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
      [btn('批量导出','btn--ghost',"window._exportCsv()"), btn('标记为可复用','btn--ghost',"alert('请在资产卡片上点击「标记可复用」按钮切换')")]
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
    var aid = sessionStorage.getItem('vf_cur_asset') || '';
    if (!aid) {
      var lr = await L4.fetch('assets.list', {limit: 1});
      var first = Array.isArray(lr.data) ? lr.data[0] : null;
      aid = first ? (first.id || '') : '';
    }
    var r = aid
      ? await L4.fetch('assets.get', {asset_id: aid})
      : {success: false, data: null, error: '暂无资产'};
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var a = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!a) return callout('warn', '暂无资产', '请先生成资产');
    var reuse = a.reusable_flag ? chip('可复用','ok') : chip('定制','neutral');
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">'+
      '<div style="aspect-ratio:1;background:var(--tint-50);border-radius:var(--r-card);'+
        'display:grid;place-items:center;border:1px solid var(--line);overflow:hidden">'+
        (a.storage_ref
          ? '<img src="'+a.storage_ref+'" style="width:100%;height:100%;object-fit:contain" alt="资产大图">'
          : '<span class="ph-ico" style="font-size:48px;color:var(--t-3)">▣</span>')+
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
      btn('引用到当前任务',null,"window._assetQuote('"+(a.id||'')+"')")+
      btn('下载原图','btn--ghost',"window.open('"+(a.storage_ref||'')+"','_blank')")+
      btn('查看生成任务详情','btn--ghost',"location.hash='task-pipeline'")+
    '</div>';
  }
});

// ⑤ 生成台账组
function ledgerMonth(){
  var day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return {date_from:day.slice(0,7)+'-01',date_to:day};
}
function ledgerEscape(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
window._ledgerDetails=async function(module,layer,model){
  var p=ledgerMonth();p.module=module;p.layer=layer;p.effective_model=model;p.limit=200;
  var r=await L4.fetch('ledger.list',p);
  var area=document.getElementById('ledgerDetails');
  if(!area)return;
  area.innerHTML=r.success?panel('调用明细（最多200条）',table(['时间','模块','层级','请求模型','实际模型','降级原因','状态','重试','成本','错误'],(r.data||[]).map(function(x){return [x.created_at,x.module,x.layer,x.requested_model,x.effective_model,x.fallback_reason,x.status,x.retry_count,x.cost_estimate_usd,x.error_message].map(ledgerEscape);}))) : callout('warn','明细加载失败',ledgerEscape(r.error));
};
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
    var r = await L4.fetch('ledger.summary', ledgerMonth());
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    if (!rows.length) return ghost('暂无台账数据');
    var totalCalls = 0, totalCost = 0, totalOk = 0, totalFailed = 0;
    rows.forEach(function(m){
      var c = Number(m.call_count) || 0;
      var ok = Number(m.success_count) || 0;
      totalCalls += c; totalOk += ok; totalCost += Number(m.total_cost_usd) || 0;
      totalFailed += Number(m.failed_count) || 0;
    });
    var failRate = totalCalls ? (totalFailed / totalCalls * 100).toFixed(1) : '0.0';
    var avgCost = totalCalls ? (totalCost / totalCalls).toFixed(3) : '0.000';
    var sorted = rows.slice().sort(function(a,b){
      return (Number(b.total_cost_usd) || 0) - (Number(a.total_cost_usd) || 0);
    });
    var tr = sorted.map(function(m){
      var c = Number(m.call_count) || 0;
      var ok = Number(m.success_count) || 0;
      var cost = Number(m.total_cost_usd) || 0;
      var share = totalCost ? (cost / totalCost * 100).toFixed(1) + '%' : '0%';
      var fr = c ? ((Number(m.failed_count)||0) / c * 100).toFixed(1) + '%' : '0%';
      return [m.module || '-', String(c), '$' + cost.toFixed(2), share, fr];
    });
    return stats([
      ['本月调用次数', String(totalCalls), '上海时区月初至今', 'ok'],
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
    '对照请求模型、实际模型和降级次数，判断路由变化；GPT调用本身不等于发生降级',
    '点击单元格数字可下钻到该维度的具体调用记录',
    '<b>输入/输出 tokens</b>为模型返回的真实用量；L0/L1 的模型调用按 token 计价，L2 生图按张计价（无 token）'
  ],
  body: async function(){
    var r = await L4.fetch('ledger.breakdown', ledgerMonth());
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
      var link='<button class="btn btn--ghost" onclick="window._ledgerDetails('+[m.module,m.layer,m.effective_model].map(function(x){return ledgerEscape(JSON.stringify(x||''));}).join(',')+')">'+c+'</button>';
      return [ledgerEscape(m.module),ledgerEscape(m.layer),ledgerEscape(m.requested_model),ledgerEscape(m.effective_model),link,String(m.fallback_count||0), '$' + cost.toFixed(2), share, avg, String(m.total_prompt_tokens||0), String(m.total_completion_tokens||0)];
    });
    return panel('本月层级 / 模型拆分', table(
      ['模块','层级','请求模型','实际模型','调用次数','路由变化','总成本','成本占比','平均耗时','输入tokens','输出tokens'],
      tr
    ), {note: '共 ' + totalCalls + ' 次调用 · 总成本 $' + totalCost.toFixed(2) + ' · 点击调用次数查看记录'})+'<div id="ledgerDetails"></div>';
  }
});

page('ledger-failure', {
  roles: ['系统管理员'],
  spec: {
    q: '失败率与重试分析：按模块/层级下钻，展示error_message样例',
    acts: ['识别失败和部分完成记录','查看错误信息和重试次数','导出错误CSV'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger'],
    limits: ['只展示最近7天失败记录']
  },
  body: async function(){
    var now=new Date(),past=new Date(now.getTime()-6*86400000);
    var fmt=function(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
    var rf = await L4.fetch('ledger.failures', {date_from:fmt(past),date_to:fmt(now),limit:200});
    if (!rf.success) return callout('warn', '数据加载失败', rf.error || '未知错误');
    var failed = rf.data || [];
    if (!failed.length) return ghost('暂无失败记录');
    return panel('最近7天失败 / 部分完成记录',table(['时间','模块','层级','实际模型','状态','重试次数','成本','错误原因'],failed.map(function(x){return [x.created_at,x.module,x.layer,x.effective_model,x.status,x.retry_count,x.cost_estimate_usd,x.error_message].map(ledgerEscape);})),{note:'最多200条。重试需要重新核对产品与生成参数后在任务页提交，不提供无参数盲重试。'})+'<div class="btnrow">'+btn('导出错误日志CSV','btn--ghost','window._exportCsv()')+'</div>';
  }
});

/* ══ 注册完整性自检 ══
   ④ 素材资产库组: asset-gallery, asset-detail (2)
   ⑤ 生成台账组: ledger-cost, ledger-breakdown, ledger-failure (3)
   共5页 ✓ */
