/* ══ pages-d.js: ⑥配置中心组(6页) + ⑦系统设置组(4页) ══ */

/* ─── 配置表动态渲染：用 Object.keys 生成列，不臆造后端字段（id 为技术主键不展示） ─── */
/* 上线追踪/配置类表格的列名中文映射（后端字段名不直接示人） */
var CFG_LABELS = {
  product_identity_id:'产品', asset_ids:'关联资产', listing_url:'上架链接', published_at:'上架时间',
  published_by:'登记人', platform:'平台', notes:'备注', created_at:'创建时间',
  listing_publication_id:'上架记录', snapshot_period:'统计周期', impressions:'展示次数',
  clicks:'点击次数', conversion_rate:'转化率(%)', units_sold:'销量(件)', source:'数据来源',
  synced_at:'同步时间', test_group_label:'分组标签', theme_code:'主题代码', started_at:'开始时间',
  ended_at:'结束时间', result_summary:'结果摘要', scope:'适用范围', suggestion_text:'优化建议',
  based_on_ab_test_ids:'依据测试', generated_at:'生成时间', reviewed_by:'复核人',
  version:'版本', description:'说明', applied_at:'应用时间', thumbnail_ref:'缩略图',
  asin:'ASIN', title:'标题', price:'价格', rating:'评分', review_count:'评论数',
  monthly_sales_volume:'月销量(估算)', bsr:'类目排名', raw_payload:'原始返回',
  brand_name:'品牌名', category_scope:'适用品类', added_by:'登记人', note:'说明',
  region:'地区', body_type:'体型', age_band:'年龄段', height_ratio:'头身比', bmi_range:'BMI范围',
  market_code:'市场代码', language:'语言', currency:'货币', overlay_language_default:'水印默认语言',
  object_name:'参照物', dimensions:'尺寸', applicable_image_types:'适用图片类型',
  theme_name:'主题名', season_anchor:'季节锚点', primary_color_hex:'主色', secondary_color_hex:'辅色',
  accent_color_hex:'强调色', pattern_keywords:'图案关键词', big_title_hook:'Banner主标题', badge:'角标',
  icon_bullets:'Detail图标文案', cta:'CTA文案', emotion_anchor:'情绪锚点', reference_image_urls:'参考图',
  decisive_moment:'决定性瞬间', ia6_params:'IA6人设覆盖', lighting_anchor:'光线锚点', is_custom:'自定义',
  cosmo_default_cohort:'默认人群画像',
  active:'状态', trigger_keyword:'触发词', category_tag:'品类标签', forced_model:'强制模型', reason:'原因',
  provider:'提供方', model:'模型', key_hint:'密钥(脱敏)', version_tag:'版本标签', default_quality:'默认画质',
  default_aspect_ratio_map:'默认比例', watermark_config:'水印配置', monthly_budget_usd:'月预算(USD)',
  alert_threshold_ratio:'告警阈值', updated_by:'更新人', updated_at:'更新时间',
  prompt_tokens:'输入tokens', completion_tokens:'输出tokens', total_prompt_tokens:'输入tokens合计', total_completion_tokens:'输出tokens合计', call_count:'调用次数', success_count:'成功', failed_count:'失败', partial_count:'部分成功', total_cost_usd:'成本合计(USD)', total_duration_ms:'耗时合计(ms)', retry_count:'重试次数', fallback_count:'降级次数'
};
function cfgTable(rows, emptyMsg){
  if (!rows || !rows.length) return ghost(emptyMsg || '暂无配置数据');
  /* thumbnail_ref 不按原文展示，改成缩略图列（同表有商品维度时才出现） */
  /* 全空列不展示（例如 brand_blacklist.added_by 目前无写入方），避免整列「-」占位占地方；
     但 ASIN / 上架链接 这类「必须填」的栏位即使暂时为空也要露出，否则缺值会被静默藏掉 */
  var KEEP_ALWAYS = ['asin', 'listing_url'];
  var keys = Object.keys(rows[0]).filter(function(k){
    if (k === 'id' || k === 'thumbnail_ref') return false;
    if (KEEP_ALWAYS.indexOf(k) >= 0) return true;
    return rows.some(function(r){ var v = r && r[k]; return !(v === null || v === undefined || v === ''); });
  });
  var hasThumb = rows.some(function(r){ return r && r.thumbnail_ref; });
  var cols = keys.map(function(k){ return CFG_LABELS[k] || k; });
  if (hasThumb) cols = ['缩略图'].concat(cols);
  var data = rows.map(function(row){
    var cells = keys.map(function(k){
      var v = row[k];
      if (v === null || v === undefined || v === '') return '-';
      if (typeof v === 'boolean') return (k === 'active') ? chip(v ? '启用' : '停用', v ? 'ok' : 'neutral') : chip(v ? '是' : '否', v ? 'ok' : 'neutral');
      /* jsonb 列（icon_bullets / ia6_params / decisive_moment / applicable_image_types …）
         原先直接 String() → 满屏 [object Object]，客户看不懂 */
      if (typeof v === 'object') {
        if (Array.isArray(v)) {
          if (!v.length) return '-';
          var parts = [];
          for (var ai = 0; ai < v.length; ai++) {
            var x = v[ai];
            if (x === null || x === undefined) continue;
            parts.push(typeof x === 'object' ? String(x.text || x.name || x.label || JSON.stringify(x)) : String(x));
          }
          return parts.length ? parts.join('、') : '-';
        }
        var js = JSON.stringify(v);
        if (js === '{}') return '-';
        return js.length > 160 ? (js.slice(0, 160) + '…') : js;
      }
      return String(v);
    });
    return hasThumb ? [thumbImg(row.thumbnail_ref, 40)].concat(cells) : cells;
  });
  return table(cols, data);
}

// ⑥ 配置中心组
page('cfg-ia6', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: 'IA6模特人设配置表：地区/体型/年龄段/头身比/BMI范围',
    acts: ['新增人设配置','编辑现有配置','查看覆盖率'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.ia6_persona_config'],
    writes: ['tenant_oldcat.ia6_persona_config'],
    limits: ['配置变更立即生效，无需重启n8n']
  },
  guide: [
    'IA6人设是模块A/E生成模特图时的<b>权威参照</b>（02文档§4.1）',
    'height_ratio头身比与BMI范围需真实可信（参考项目19验证数据）',
    '新增配置后建议用模块A跑测试任务验证效果'
  ],
  body: async function(){
    var r = await L4.fetch('config.list', {table:'persona', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    return toolbar(
      [inp('搜索地区/体型...'), sel('地区筛选',['全部','欧美','亚洲','非洲','拉美','中东'])],
      [btn('新增人设配置',null,"window._cfgCreate('persona')"), btn('导出配置表','btn--ghost',"window._exportCsv()")]
    ) +
    cfgTable(rows, '暂无配置数据') +
    callout('','覆盖率统计','当前已配置 <b>'+rows.length+'组人设</b>。未覆盖组合会降级到"不限"配置。');
  }
});

page('cfg-theme', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: '主题配置表：16+主题包的视觉风格定义（模块F A+页面权威源）',
    acts: ['新增主题','编辑现有主题','激活/停用主题'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.theme_config'],
    writes: ['tenant_oldcat.theme_config'],
    limits: ['主题包是prompt构建的权威源，字段变更需测试']
  },
  body: async function(){
    var r = await L4.fetch('config.list', {table:'theme', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    return toolbar(
      [inp('搜索主题...'), sel('季节锚点',['全部','春季','夏季','秋季','冬季','全年'])],
      [btn('新增主题包',null,"window._cfgCreate('theme')"), btn('批量导入','btn--ghost',"window._csvImport('theme')")]
    ) +
    cfgTable(rows, '暂无主题配置') +
    callout('','主题包约束',
      '主题包的<b>三色hex/big_title_hook/badge</b>是模块F prompt的权威输入（02文档§4.2）。变更后需用模块F跑测试验证A+页面生成效果。T-CUSTOM需用户上传参考图。'
    );
  }
});

page('cfg-brand', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: '品牌黑名单：禁止在prompt中提及的品牌（商标/版权保护）',
    acts: ['新增黑名单品牌','编辑适用品类范围','批量导入'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.brand_blacklist'],
    writes: ['tenant_oldcat.brand_blacklist'],
    limits: ['黑名单匹配不区分大小写']
  },
  body: async function(){
    var r = await L4.fetch('config.list', {table:'blacklist', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    return toolbar(
      [inp('搜索品牌名...'), sel('品类范围',['全部','HOME_DAILY','GIFT_SEASONAL','BEAUTY_PERSONAL_CARE','其他'])],
      [btn('新增黑名单品牌',null,"window._cfgCreate('blacklist')"), btn('批量导入CSV','btn--ghost',"window._csvImport('blacklist')")]
    ) +
    cfgTable(rows, '暂无黑名单品牌') +
    callout('','黑名单匹配逻辑',
      'WF-29-L0在构建prompt前会过滤黑名单品牌（不区分大小写、支持多词组合如"Crate & Barrel"）。命中后该品牌从卖点池移除，不会出现在最终prompt。'
    );
  }
});

page('cfg-market-lang', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: '市场语言映射：11国市场的语言/货币/水印语言默认值',
    acts: ['编辑市场配置','新增市场'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.market_language_map'],
    writes: ['tenant_oldcat.market_language_map'],
    limits: ['市场代码ISO 3166-1 alpha-2标准']
  },
  body: async function(){
    var r = await L4.fetch('config.list', {table:'marketlang', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    return toolbar(
      [inp('搜索市场代码...')],
      [btn('新增市场',null,"window._cfgCreate('marketlang')"), btn('批量导入','btn--ghost',"window._csvImport('marketlang')")]
    ) +
    cfgTable(rows, '暂无市场映射') +
    callout('','多市场语言策略',
      '参考02项目验证：德国/奥地利/瑞士共用德语；加拿大英语en-CA与美国en-US区分（颜色拼写colour vs color）。水印默认语言用于模块A/B/C的水印文案本地化。'
    );
  }
});

page('cfg-sensitivity', {
  roles: ['系统管理员'],
  spec: {
    q: '敏感品类路由规则：触发词→强制模型/特殊处理（商业合规护栏）',
    acts: ['新增敏感规则','编辑触发词与模型','激活/停用规则'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.sensitivity_routing'],
    writes: ['tenant_oldcat.sensitivity_routing'],
    limits: ['规则变更立即生效，涉及合规务必谨慎']
  },
  guide: [
    '敏感品类规则是<b>商业合规的最后防线</b>，变更需系统管理员权限',
    'trigger_keyword使用<b>word-boundary匹配</b>（\\b边界），防"bra"误命中"embrace"（03文档T7历史bug）',
    '规则命中后强制路由到指定模型（如Gemini 3-pro-image-preview）并记录audit log'
  ],
  body: async function(){
    var r = await L4.fetch('config.list', {table:'sensitivity', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      return [
        '<code>'+ (row.trigger_keyword || '-') +'</code>',
        row.category_tag || '-',
        row.forced_model || '-',
        row.reason || '-',
        chip(row.active ? '激活' : '停用', row.active ? 'ok' : 'neutral')
      ];
    });
    return callout('warn','Word-boundary匹配约束',
      '<b>重要：</b>trigger_keyword使用正则\\b边界匹配，避免substring误命中。例如<code>\\bbra\\b</code>只匹配独立单词"bra"，不会命中"embrace"或"brand"。'+
      '配置时需考虑复数/变体（如bra/bras）。'
    ) +
    toolbar(
      [sel('品类标签',['全部','INTIMATE_APPAREL','ADULT_PRODUCT','MEDICAL','其他'])],
      [btn('新增敏感规则',null,"window._cfgCreate('sensitivity')"), btn('测试规则匹配','btn--ghost',"window._testRule()")]
    ) +
    table(
      ['触发词','品类标签','强制模型','原因','状态'],
      data.length ? data : [['<span class="ghost">暂无敏感品类规则</span>','','','','']]
    ) +
    callout('','历史bug复盘',
      '03文档T7记录：早期版本用substring匹配"bra"误命中"embrace"标题，导致正常抱枕走内衣合规路由。当前版本已升级为word-boundary匹配（\\b边界），UI强提醒配置者理解此约束。'
    );
  }
});

page('cfg-physical', {
  roles: ['系统管理员'],
  spec: {
    q: '物理比例参照物：4个标准参照物的尺寸定义（模块B/E/F尺寸感提示权威源）',
    acts: ['编辑参照物尺寸','添加新参照物','查看适用图片类型'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.physical_reference_objects'],
    writes: ['tenant_oldcat.physical_reference_objects'],
    limits: ['尺寸需真实可信，参考项目07验证数据']
  },
  body: async function(){
    var r = await L4.fetch('config.list', {table:'physical', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    return callout('','参照物用途',
      '模块B/E/F在生成Listing图/详情图时，会在prompt中嵌入参照物尺寸提示（如"smartphone 147×71mm for scale"），帮助AI理解产品真实大小。参照物选择参考项目07验证过的4个常见物体。'
    ) +
    toolbar([], [btn('新增参照物',null,"window._cfgCreate('physical')")]) +
    cfgTable(rows, '暂无参照物配置') +
    callout('','验证来源',
      '参照物尺寸来自项目07实测验证：智能手机采用iPhone 13实际尺寸、成人手掌/头部采用人体工学平均值、信用卡采用ISO 7810标准。适用图片类型字段控制哪些模块可以引用该参照物。'
    );
  }
});

// ⑦ 系统设置组
page('sys-instance', {
  roles: ['系统管理员'],
  spec: {
    q: '多实例（多租户）管理：schema注册表只读展示',
    acts: ['查看实例列表','查看关联n8n实例','查看schema状态'],
    wf: ['WF-29-L4-API'],
    reads: ['public.tenant_registry（多实例元表）'],
    limits: ['只读展示，不提供一键切换高危操作（07文档§2.2.7）']
  },
  guide: [
    '多实例架构：每个租户一个独立schema（如tenant_oldcat/tenant_littlecat），数据物理隔离',
    '<b>不提供"一键切换实例"高危操作</b>（07文档§2.2.7明确），切换需直接修改n8n工作流的PostgreSQL节点配置',
    '本页面只做只读展示，用于排查"当前连的是哪个实例"'
  ],
  body: async function(){
    var r = await L4.fetch('admin.schema.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      return [
        row.version || '-',
        row.applied_at ? String(row.applied_at).slice(0,16) : '-',
        row.description || '-'
      ];
    });
    return callout('stop','安全约束：不提供一键切换实例操作',
      '07文档§2.2.7明确：<b>前端不提供"切换实例"按钮</b>。切换租户需直接修改n8n工作流的PostgreSQL节点schema配置，并重启工作流。'+
      '这是高危操作（误切会污染生产数据），必须在n8n后台由开发运维人员操作，不向UI层开放。本页面<b>只做只读展示</b>。'
    ) +
    panel('Schema 迁移记录（只读）', table(
      ['版本','应用时间','说明'],
      data.length ? data : [['<span class="ghost">暂无迁移记录</span>','','']]
    )) +
    panel('当前连接信息', kv([
      ['当前schema','tenant_oldcat'],
      ['PostgreSQL Host','zeabur-postgres.xxx.com'],
      ['n8n实例','n8n-zeabur-oldcat（运行中）'],
      ['最后健康检查','2026-08-19 15:10']
    ]));
  }
});

page('sys-cred', {
  roles: ['系统管理员'],
  spec: {
    q: '凭证管理：展示凭证名称/类型/关联工作流，不显示明文Key',
    acts: ['查看凭证列表','查看关联工作流数','跳转n8n凭证页'],
    wf: ['WF-29-L4-API（engine.cred.list）'],
    reads: ['platform.credential_registry'],
    limits: ['UI不显示明文Key/Secret，这是最后防线（07文档§2.2.7）']
  },
  guide: [
    '凭证管理在n8n后台完成，本页面只做<b>引用关系可视化</b>',
    '<b>不显示明文Key/Secret</b>（显示为sk-****占位），这是UI层安全的最后防线',
    '点击"跳转n8n凭证页"可直接打开n8n后台对应凭证编辑页（需登录权限）'
  ],
  body: async function(){
    var r = await L4.fetch('engine.cred.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var activeN = rows.filter(function(x){ return x.active; }).length;
    var staleN = rows.filter(function(x){ return !x.synced_at; }).length;
    var data = rows.map(function(row){
      return [
        row.provider || '-',
        '<span class="mono">' + (row.model || '-') + '</span>',
        '<span class="mono">' + (row.key_hint || '****') + '</span>',
        row.synced_at ? String(row.synced_at).slice(0,16).replace('T',' ') : '<span class="ghost">未同步</span>',
        chip(row.active ? '启用' : '停用', row.active ? 'ok' : 'neutral'),
        '<button class="xbtn" onclick="window.open(\'https://oldcat.zeabur.app/credentials\',\'_blank\')">n8n 后台查看</button>'
      ];
    });
    return callout('','凭证登记总览',
      '已登记 <b>' + rows.length + '</b> 条 · 启用 <b>' + activeN + '</b> 条 · 未同步 <b>' + staleN + '</b> 条。'+
      '本页只做<b>引用可视化与脱敏展示</b>：前端<b>永不显示明文Key/Secret</b>（显示为 <code>sk-****</code> 占位）。'+
      '这是07文档§2.2.7规定的UI层最后防线，防止屏幕录制/截图泄密。'
    ) +
    toolbar(
      [sel('凭证类型',['全部','API Key','OAuth2','PostgreSQL','MCP Server'])],
      [btn('跳转n8n凭证页（需权限）','btn--ghost',"window.open('https://oldcat.zeabur.app/credentials','_blank')")]
    ) +
    table(
      ['提供方','模型','密钥(脱敏)','最近同步','状态','关联工作流'],
      data.length ? data : [['<span class="ghost">暂无凭证记录</span>','','','','','']]
    ) +
    callout('warn', rows.length ? '凭证到期提醒' : '尚未登记任何凭证',
      rows.length
        ? '请定期检查凭证的<b>最近同步时间</b>，长期未同步的凭证建议停用（active=false）以降低泄露风险。'
        : '当前凭证登记表无记录：生成链路实际调用的密钥保存在 <b>n8n 凭据库</b>，本页只是登记台账（<b>不参与出图</b>）。'
          + '如需在此登记提示信息，请到 7.3「AI 模型与密钥」保存（只登记 provider/model/key_hint，明文不入库）。'
    );
  }
});

page('adm-user', {
  roles: ['系统管理员'],
  spec: {
    q: '用户与权限：用户账号列表、新增账号、改角色、改密码、删除账号',
    acts: ['新增账号','修改角色','重置密码','删除账号'],
    wf: ['WF-29-L4-API'],
    reads: ['platform.users'],
    writes: ['platform.users'],
    limits: ['仅系统管理员可操作','密码 bcrypt 哈希存储，永不回显','删除为软删除（active=false）']
  },
  body: async function(){
    var r = await L4.fetch('admin.user.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var roleTone = {'系统管理员':'ok','内容管理员':'neutral','运营':'neutral'};
    var roleOpts = ['运营','内容管理员','系统管理员'];
    var roleCodeCn = {operator:'运营', content_admin:'内容管理员', sys_admin:'系统管理员'};
    window._admUserCache = {};
    rows.forEach(function(rr){ window._admUserCache[rr.user_name] = rr.roles || []; });
    var data = rows.map(function(row){
      var un = row.user_name || '-';
      var btns = '<button class="xbtn" onclick="window._admEditRole(\''+un+'\')">改角色</button> ' +
                 '<button class="xbtn" onclick="window._admResetPwd(\''+un+'\')">改密码</button> ' +
                 '<button class="xbtn xbtn--danger" onclick="window._admDelete(\''+un+'\')">删除</button>';
      return [
        un,
        chip(row.role || '-', roleTone[row.role] || 'neutral'),
        chip(row.active ? '启用' : '停用', row.active ? 'ok' : 'neutral'),
        row.last_login_at ? String(row.last_login_at).slice(0,16).replace('T',' ') : '从未登录',
        btns
      ];
    });
    var addForm = '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' +
      '<input id="nu_name" placeholder="用户名" class="inp" style="flex:1;min-width:120px">' +
      '<input id="nu_pass" type="password" placeholder="初始密码" class="inp" style="flex:1;min-width:120px">' +
      '<select id="nu_role" class="sel">' + roleOpts.map(function(r){return '<option>'+r+'</option>';}).join('') + '</select>' +
      '<button class="btn" onclick="window._admCreate()">新增账号</button>' +
      '</div>';
    return panel('用户账号管理', addForm +
      table(['用户名','角色','状态','最后登录','操作'], data.length ? data : [['<span class="ghost">暂无用户</span>','','','','']])
    );
  }
});

/* ── 账号管理操作函数（adm-user 用）── */
window._admCreate = async function(){
  var n = document.getElementById('nu_name').value.trim();
  var p = document.getElementById('nu_pass').value;
  var r = document.getElementById('nu_role').value;
  if (!n || !p) { alert('请输入用户名和密码'); return; }
  var res = await L4.fetch('admin.user.create', {user_name: n, password: p, role: r});
  if (res.success && res.data && res.data.length > 0) { alert('已新增账号 ' + n); location.reload(); }
  else { alert('新增失败：' + (res.error || '用户名可能已存在')); }
};
window._admEditRole = function(un){
  var map = [['运营','operator'],['内容管理员','content_admin'],['系统管理员','sys_admin']];
  var cur = (window._admUserCache && window._admUserCache[un]) || [];
  var html = map.map(function(pr){
    var ck = (cur.indexOf(pr[1]) >= 0) ? ' checked' : '';
    return '<label style="display:block;margin:8px 0;font-size:13px;cursor:pointer"><input type="checkbox" value="' + pr[1] + '"' + ck + '> ' + pr[0] + '</label>';
  }).join('');
  var old = document.getElementById('roleDlg'); if (old) old.remove();
  var dlg = document.createElement('div');
  dlg.id = 'roleDlg';
  dlg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  dlg.innerHTML = '<div style="background:#fff;border-radius:10px;padding:20px 22px;min-width:300px;box-shadow:0 8px 30px rgba(0,0,0,.2)">'
    + '<div style="font-weight:600;margin-bottom:10px">设置「' + un + '」的角色（可多选）</div>'
    + html
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'
    + '<button class="xbtn" onclick="document.getElementById(\'roleDlg\').remove()">取消</button>'
    + '<button class="btn" onclick="window._admRoleSave(\'' + un + '\')">保存</button></div></div>';
  document.body.appendChild(dlg);
};
window._admRoleSave = async function(un){
  var boxes = document.querySelectorAll('#roleDlg input[type=checkbox]');
  var codes = [];
  Array.prototype.forEach.call(boxes, function(b){ if (b.checked) codes.push(b.value); });
  if (!codes.length) { alert('至少选择一个角色'); return; }
  var res = await L4.fetch('admin.user.set_roles', {user_name: un, roles: codes});
  if (res.success) { document.getElementById('roleDlg').remove(); alert('已设置 ' + codes.length + ' 个角色'); location.reload(); }
  else { alert('设置失败：' + (res.error || '')); }
};
window._admResetPwd = async function(un){
  var np = prompt('输入新密码（重置 ' + un + ' 的登录密码）：');
  if (!np) return;
  var res = await L4.fetch('admin.user.reset_password', {user_name: un, new_password: np});
  if (res.success) { alert('密码已重置'); }
  else { alert('重置失败：' + (res.error || '')); }
};
window._admDelete = async function(un){
  if (!confirm('确认删除账号 ' + un + ' ？（软删除，可恢复）')) return;
  var res = await L4.fetch('admin.user.delete', {user_name: un});
  if (res.success) { alert('已删除账号'); location.reload(); }
  else { alert('删除失败：' + (res.error || '')); }
};

page('adm-audit', {
  roles: ['系统管理员'],
  spec: {
    q: '操作审计日志：配置变更/资产引用/DNA刷新/凭证变更/访问被拒记录',
    acts: ['按时间/操作人/类型筛选','搜索操作对象与详情','导出审计日志'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.audit_log'],
    limits: ['保留最近90天日志，更早的归档到对象存储；敏感操作（凭证变更/权限变更）永久保留（02文档§9.7）']
  },
  guide: [
    '操作类型已按<b>实际动作</b>分类：拒绝访问归「访问被拒」，不再混进「权限变更」',
    '三个筛选项可组合使用（搜索框对操作人/对象/详情/类型中文名做全文匹配）',
    '<b>访问被拒</b>通常是未登录或权限不足的调用被后端拦下，属正常防护记录'
  ],
  body: async function(){
    var r = await L4.fetch('admin.audit.list', {limit: 200});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    window.__auditRaw = rows;
    var actors = [];
    var typesInData = [];
    rows.forEach(function(x){
      var a = String(x.actor || '-');
      if (actors.indexOf(a) < 0) actors.push(a);
      if (typesInData.indexOf(x.action_type) < 0) typesInData.push(x.action_type);
    });
    actors.sort();
    typesInData.sort();
    var typeOpts = ['<option value="">全部类型</option>'].concat(typesInData.map(function(t){
      var zh = (window.AUDIT_ZH[t] || {}).zh || t;
      return '<option value="' + t + '">' + zh + '</option>';
    })).join('');
    var actorOpts = ['<option value="">全部操作人</option>'].concat(actors.map(function(a){
      return '<option value="' + a + '">' + a + '</option>';
    })).join('');
    var bar = '<div class="tb"><div class="flt">'
      + '<input class="inp" id="auditQ" placeholder="搜索操作人/对象/详情..." oninput="window._auditApply()">'
      + '<select class="sel" id="auditType" onchange="window._auditApply()">' + typeOpts + '</select>'
      + '<select class="sel" id="auditActor" onchange="window._auditApply()">' + actorOpts + '</select>'
      + '</div><div class="btnrow" style="margin:0;align-items:center">'
      + '<span id="auditCount" style="font-size:12.5px;color:var(--t-3);margin-right:8px"></span>'
      + '<button class="btn btn--ghost" onclick="window._exportCsv()">导出CSV</button>'
      + '</div></div>';
    var html = bar + table(
      ['时间','操作人','操作类型','操作对象','详情','IP地址'],
      []
    ).replace('<tbody></tbody>', '<tbody>' + window.__auditRowHtml(rows) + '</tbody>')
      + callout('','审计日志保留策略',
        '最近90天日志保留在PostgreSQL以供快速查询，更早的日志归档到Zeabur对象存储（90天-2年）。敏感操作（凭证变更/权限变更）永久保留。'
        + '<br><b>类型说明：</b>「访问被拒」= 未登录/权限不足被后端拦下（正常防护）；「操作失败」= 业务执行失败。');
    setTimeout(function(){ window._auditApply(); }, 0);
    return html;
  }
});

/* ══ 注册完整性自检（2026-08-26 v1.2：补齐 ⑦⑧⑨ 组 11 个缺失页面，接 L4-API 真实数据）══
   ⑥ 配置中心组: cfg-ia6, cfg-theme, cfg-brand, cfg-market-lang, cfg-sensitivity, cfg-physical (6)
   ⑦ 系统设置组: sys-instance, sys-cred, sys-model, sys-binding, sys-param (5)
   ⑧ 上线跟踪组: track-publish, track-perf, track-ab, track-backtest (4)
   ⑨ 管理后台组: adm-user, adm-audit, adm-perm, adm-db, adm-integration, adm-cost (6)
   本文件共21页 */

/* ═══════ ⑦ 系统设置组补页 ═══════ */

// sys-model：AI 模型与密钥（静态说明页，不接数据）
page('sys-model', {
  roles: ['系统管理员'],
  spec: {
    q: 'AI 模型与密钥：录入模型密钥（粘贴），脱敏存储，同步到 n8n 后台',
    acts: ['录入密钥','查看脱敏密钥','同步到 n8n'],
    wf: ['WF-29-L4-API'],
    reads: ['platform.credential_registry'],
    writes: ['platform.credential_registry'],
    limits: ['密钥仅显示脱敏 hint，明文永不回显','实际同步到 n8n credentials 由独立同步脚本执行']
  },
  body: async function(){
    var r = await L4.fetch('engine.cred.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      return [
        row.provider || '-',
        row.model || '-',
        '<span class="mono">' + (row.key_hint || '****') + '</span>',
        chip(row.active ? '启用' : '停用', row.active ? 'ok' : 'neutral'),
        row.synced_at ? String(row.synced_at).slice(0,16).replace('T',' ') : '未同步'
      ];
    });
    var addForm = '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' +
      '<input id="ck_provider" placeholder="提供方(如 云雾)" class="inp" style="flex:1;min-width:100px">' +
      '<input id="ck_model" placeholder="模型(如 gemini-3-pro-image-preview)" class="inp" style="flex:1.4;min-width:170px">' +
      '<input id="ck_key" type="password" placeholder="密钥(sk-...)" class="inp" style="flex:1.4;min-width:160px">' +
      '<button class="btn" onclick="window._credSave()">保存密钥</button>' +
      '</div>';
    return callout('', '登记台账，不参与出图', '本页保存的是平台侧<b>凭证登记</b>信息（哪个提供方/模型配了哪个密钥提示）。实际调用用的密钥保存在 n8n 凭据库，生成链路<b>不从这张表取密钥</b> —— 在这里改动不会影响出图。如需让登记信息驱动实际调用，属待接入项。') + panel('模型密钥管理',
      callout('', '密钥安全', '密钥<b>只存加密密文</b>，前端<b>永不回显明文</b>，仅显示脱敏 hint（如 sk-****xxxx）。保存后由独立同步脚本同步到 n8n credentials，供生图工作流调用。') +
      addForm +
      table(['提供方','模型','密钥(脱敏)','状态','同步时间'], data.length ? data : [['<span class="ghost">暂无密钥</span>','','','','']])
    );
  }
});

/* ── 密钥保存函数（sys-model 用）── */
window._credSave = async function(){
  var prov = document.getElementById('ck_provider').value.trim();
  var model = document.getElementById('ck_model').value.trim();
  var key = document.getElementById('ck_key').value.trim();
  if (!prov || !model || !key) { alert('请填写提供方、模型、密钥'); return; }
  var res = await L4.fetch('engine.cred.save', {provider: prov, model: model, key: key});
  if (res.success) { alert('密钥已保存（加密存储，脱敏显示）'); location.reload(); }
  else { alert('保存失败：' + (res.error || '')); }
};

page('sys-binding', {
  roles: ['系统管理员'],
  spec: {
    q: '各环节用哪个模型：绑定环节与模型名的映射关系',
    acts: ['查看绑定关系','编辑绑定','验证当前绑定'],
    wf: ['WF-29-L4-API'],
    reads: ['platform.model_profile_binding'],
    limits: ['绑定变更影响生成效果，需回归测试']
  },
  guide: [
    '每个<b>生成环节</b>（场景图/模特图/文案/合规审查等）绑定一个具体模型',
    '修改绑定后需跑一次测试任务验证生成效果（02文档§5.x）'
  ],
  body: async function(){
    var r = await L4.fetch('engine.binding.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      return [
        row.binding_scope || '-',
        row.model_name || '-',
        chip(row.active ? '启用' : '停用', row.active ? 'ok' : 'neutral'),
        row.updated_by || '-',
        row.updated_at ? String(row.updated_at).slice(0,16) : '-'
      ];
    });
    return callout('', '登记台账，不参与出图', '本页是<b>模型绑定登记</b>。实际出图用哪个模型由 L2 引擎按「敏感品类 / 有无参考图 / 文字密集」自动路由，<b>不读这张表</b> —— 改这里不会改变路由结果。') + toolbar(
      [inp('搜索绑定环节...'), sel('状态',['全部','启用','停用'])],
      [btn('刷新','btn--ghost',"location.reload()")]
    ) +
    table(
      ['绑定环节','模型名','状态','更新人','更新时间'],
      data.length ? data : [['<span class="ghost">暂无绑定记录</span>','','','','']]
    );
  }
});

// sys-param：生图参数版本（接 engine.param.list）
page('sys-param', {
  roles: ['系统管理员'],
  spec: {
    q: '生图参数版本：版本标签/默认质量/默认比例/水印配置',
    acts: ['查看参数版本','对比版本差异','设置默认版本'],
    wf: ['WF-29-L4-API'],
    reads: ['platform.image_gen_param_version'],
    limits: ['参数版本变更影响全量生成，需灰度验证']
  },
  guide: [
    '每个版本记录默认质量/默认比例/水印配置，作为生图任务的<b>权威参数源</b>',
    '切换默认版本需谨慎：会影响所有未显式指定参数的生成任务'
  ],
  body: async function(){
    var r = await L4.fetch('engine.param.list', {limit:50});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      return [
        row.version_tag || '-',
        row.default_quality || '-',
        (typeof row.default_aspect_ratio_map === 'object' ? JSON.stringify(row.default_aspect_ratio_map) : (row.default_aspect_ratio_map || '-')),
        (typeof row.watermark_config === 'object' ? JSON.stringify(row.watermark_config) : (row.watermark_config || '-')),
        chip(row.active ? '启用' : '停用', row.active ? 'ok' : 'neutral'),
        row.created_at ? String(row.created_at).slice(0,16) : '-'
      ];
    });
    return callout('', '登记台账，不参与出图', '本页是<b>生图参数版本登记</b>。当前默认画质/画幅由工作流内部参数决定，生成链路<b>不读这张表</b> —— 改这里不会改变出图效果。') + toolbar(
      [inp('搜索版本标签...'), sel('状态',['全部','启用','停用'])],
      [btn('新增参数版本',null,"window._paramCreate()"), btn('导出','btn--ghost',"window._exportCsv()")]
    ) +
    table(
      ['版本标签','默认质量','默认比例','水印配置','状态','创建时间'],
      data.length ? data : [['<span class="ghost">暂无参数版本</span>','','','','','']]
    );
  }
});

/* ═══════ ⑧ 上线跟踪组 ═══════ */

// track-publish：上架登记（接 listing.list table=publication）
page('track-publish', {
  roles: ['*'],
  spec: {
    q: '上架登记：已上架商品的登记记录',
    acts: ['查看上架登记','按渠道筛选','登记新上架'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.publication'],
    limits: ['登记是人工操作，需与实际上架状态一致']
  },
  body: async function(){
    var r = await L4.fetch('listing.list', {table:'publication', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var noAsin = rows.filter(function(x){ return !String(x.asin || '').trim(); }).length;
    var gap = (rows.length && noAsin)
      ? callout('warn', noAsin + ' 条登记还没填 ASIN（本商品真实 ASIN）',
          '这些记录只能作为「已上架」的登记，<b>无法进入 8.2「按 ASIN 同步市场数据」</b>——同步是按 ASIN 去抓价格/评分/评论数的。'
          + '<br>补齐入口：回到本页重新登记一条（填 ASIN + Listing 链接），或在 n8n 侧补数据。'
          + '<br><b>注意</b>：竞品参照 ASIN 不能当成本商品 ASIN 登记，两者含义不同。')
      : '';
    return toolbar(
      [inp('搜索SKU...'), sel('渠道',['全部'])],
      [btn('登记新上架',null,"window._publishCreate()"), btn('导出','btn--ghost',"window._exportCsv()")]
    ) +
    gap +
    cfgTable(rows, '暂无上架登记记录');
  }
});

// track-perf：实际表现数据（接 listing.list table=snapshot）
page('track-perf', {
  roles: ['*'],
  spec: {
    q: '实际表现数据：上架后每周表现快照',
    acts: ['查看表现快照','按周筛选','对比趋势'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.snapshot'],
    limits: ['市场侧数据(价格/评分/评论数)按 ASIN 由 SORFTIME 同步；曝光/点击/转化率/销量为亚马逊后台口径，需手工录入']
  },
  body: async function(){
    var r = await L4.fetch('listing.list', {table:'snapshot', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    return toolbar(
      [inp('搜索SKU...'), sel('周次',['全部'])],
      [btn('按ASIN同步市场数据',null,"window._syncMarket()"), btn('录入周表现','btn--ghost',"window._snapshotCreate()"), btn('导出周报','btn--ghost',"window._exportCsv()")]
    ) +
    callout('', '字段来源（重要）', '<b>市场侧</b>（价格 / 评分 / 评论数 / 标题）：由「按ASIN同步市场数据」从 SORFTIME 拉取，来源标记 SORFTIME_SYNC；<b>后台侧</b>（展示次数 / 点击次数 / 转化率 / 销量）：SORFTIME 拿不到，需用「录入周表现」手工录入，来源标记 MANUAL_ENTRY。两类指标按「上架记录 + 周期 + 来源」各自留存，互不覆盖。') +
    cfgTable(r.data || [], '暂无表现快照数据');
  }
});

// track-ab：A/B测试记录（接 listing.list table=ab_test）
page('track-ab', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: 'A/B测试记录：对比测试的样本与结论',
    acts: ['查看AB测试','记录测试结论','对比版本'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.ab_test'],
    limits: ['AB测试结论需人工判定显著性']
  },
  body: async function(){
    var r = await L4.fetch('listing.list', {table:'ab_test', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    return toolbar(
      [inp('搜索测试名...'), sel('状态',['全部','进行中','已结束'])],
      [btn('新建AB测试',null,"window._abCreate()")]
    ) +
    cfgTable(r.data || [], '暂无AB测试记录');
  }
});

// track-backtest：优化建议与回测（接 listing.list table=backtest）
page('track-backtest', {
  roles: ['内容管理员','系统管理员'],
  spec: {
    q: '优化建议与回测：参数优化的回测记录与建议',
    acts: ['查看回测记录','应用优化建议','对比回测结果'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.backtest'],
    limits: ['回测结果仅供参考，需人工复核']
  },
  body: async function(){
    var r = await L4.fetch('listing.list', {table:'backtest', limit:100});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    return toolbar(
      [inp('搜索回测名...'), sel('状态',['全部'])],
      [btn('发起回测',null,"window._backtestCreate()")]
    ) +
    cfgTable(r.data || [], '暂无回测记录');
  }
});

/* ═══════ ⑨ 管理后台组补页 ═══════ */

// adm-db：数据维护（接 admin.schema.list）
page('adm-db', {
  roles: ['系统管理员'],
  spec: {
    q: '数据维护：schema迁移记录与数据库状态',
    acts: ['查看迁移记录','查看schema版本','执行数据维护'],
    wf: ['WF-29-L4-API'],
    reads: ['platform.schema_migrations'],
    limits: ['迁移是高风险操作，仅在n8n后台执行']
  },
  guide: [
    'schema 迁移记录是数据库结构的<b>变更历史</b>，用于排查版本不一致',
    '迁移操作本身在 n8n 后台执行，前端只做只读展示'
  ],
  body: async function(){
    var r = await L4.fetch('admin.schema.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      return [
        row.version || '-',
        row.applied_at ? String(row.applied_at).slice(0,16) : '-',
        row.description || '-'
      ];
    });
    return callout('','数据维护说明',
      'schema 迁移记录为只读展示。执行迁移（DDL）需在 n8n 后台的 PostgreSQL 节点中操作，前端<b>不提供</b>任何写库入口。'
    ) +
    panel('Schema 迁移记录', table(
      ['版本','应用时间','说明'],
      data.length ? data : [['<span class="ghost">暂无迁移记录</span>','','']]
    ));
  }
});

// adm-perm：权限说明（静态说明页，三角色权限矩阵）
page('adm-perm', {
  roles: ['系统管理员'],
  spec: {
    q: '权限说明：三角色（运营/内容管理员/系统管理员）的关键操作权限矩阵',
    acts: ['查看权限矩阵','了解角色边界'],
    wf: [],
    reads: [],
    limits: ['权限矩阵是权威定义，前端只做展示（07文档§3.2）']
  },
  body: function(){
    return panel('三角色权限矩阵',
      '<p style="font-size:12px;color:var(--t-3);margin-bottom:10px">完整权限矩阵见07文档§3.2，此处展示核心差异</p>' +
      table(
        ['操作','运营','内容管理员','系统管理员'],
        [
          ['查看产品身份库',chip('✓','ok'),chip('✓','ok'),chip('✓','ok')],
          ['强制刷新DNA',chip('✗','neutral'),chip('✓','ok'),chip('✓','ok')],
          ['提交生成任务',chip('✓','ok'),chip('✓','ok'),chip('✓','ok')],
          ['修改配置表（IA6/主题/品牌）',chip('✗','neutral'),chip('✓','ok'),chip('✓','ok')],
          ['修改敏感路由规则',chip('✗','neutral'),chip('✗','neutral'),chip('✓','ok')],
          ['查看成本台账',chip('✗','neutral'),chip('✓','ok'),chip('✓','ok')],
          ['管理用户与凭证',chip('✗','neutral'),chip('✗','neutral'),chip('✓','ok')],
          ['查看审计日志',chip('✗','neutral'),chip('✗','neutral'),chip('✓','ok')]
        ]
      ));
  }
});

// adm-integration：生产配置及数据库业务证据，不把静态配置冒充实时健康状态。
page('adm-integration', {
  roles: ['系统管理员'],
  spec: {
    q: '系统对接：展示接入的 LLM 网关与外部服务',
    acts: ['查看网关列表','查看对接状态'],
    wf: ['n8n后台（网关配置）'],
    reads: ['generation_ledger','sorftime_cache','generated_assets'],
    limits: ['网关配置在 n8n 后台，前端只读展示']
  },
  body: async function(){
    var r=await L4.fetch('admin.integration.list',{});
    if(!r.success)return callout('warn','系统对接加载失败',ledgerEscape(r.error));
    return panel('生产系统对接与最近业务证据',table(
      ['服务','用途','地址','证据口径','最近成功记录'],
      (r.data||[]).map(function(x){return [x.service,x.purpose,x.endpoint,x.evidence,x.last_success||'暂无成功记录'].map(ledgerEscape);})
    ),{note:'配置与业务历史不等同于实时可用性。Google Drive/飞书驱动未作为当前OSS归档链路启用，不展示虚假在线状态。'});
  }
});

// adm-cost：用量与费用（接 admin.budget.list）
page('adm-cost', {
  roles: ['系统管理员'],
  spec: {
    q: '用量与费用：月度预算与告警阈值配置',
    acts: ['查看预算配置','设置告警阈值','查看用量'],
    wf: ['WF-29-L4-API'],
    reads: ['platform.cost_budget_config'],
    limits: ['预算告警仅提醒，不自动停用']
  },
  body: async function(){
    var r = await L4.fetch('admin.budget.list', {});
    if (!r.success) return callout('warn', '数据加载失败', r.error || '未知错误');
    var rows = r.data || [];
    var data = rows.map(function(row){
      var thr = row.alert_threshold_ratio;
      var thrTxt = (thr === undefined || thr === null) ? '-' :
        (Number(thr) <= 1 ? Math.round(Number(thr)*100)+'%' : thr+'%');
      return [
        row.scope || '-',
        (row.monthly_budget_usd === undefined || row.monthly_budget_usd === null) ? '-' : '$'+row.monthly_budget_usd,
        thrTxt,
        chip(row.active ? '启用' : '停用', row.active ? 'ok' : 'neutral'),
        row.updated_by || '-',
        row.updated_at ? String(row.updated_at).slice(0,16) : '-'
      ];
    });
    return callout('', '登记台账，不阻断出图', '本页是<b>成本预算登记</b>。成本为估算值；当前<b>未做超预算硬性中断</b>，仅作记录与提醒用途。') + panel('成本预算配置', table(
      ['范围','月预算(USD)','告警阈值','状态','更新人','更新时间'],
      data.length ? data : [['<span class="ghost">暂无预算配置</span>','','','','','']]
    )) +
    callout('','预算告警策略',
      '当月度用量达到<b>告警阈值</b>时触发提醒（飞书/邮件），但<b>不自动停用</b>生成服务，避免误伤在途任务。'
    );
  }
});
