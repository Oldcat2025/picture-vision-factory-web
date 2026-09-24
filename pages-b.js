/* ══ pages-b.js: ③生成任务组(8页) ══ */

// 共用辅助：DNA状态提示条（查真实 dna_status）
async function dnaCallout(sku){
  var r = await L4.fetch('product.get', {sku: sku});
  var item = (r.data||[])[0];
  var id = item ? item.identity : null;
  var st = id ? id.dna_status : '';
  if (st === 'APPROVED') {
    return callout('','已有 Product DNA 与人群画像',
      '<b>'+sku+'</b> 的 Layer0/Layer1 数据已缓存，本次生成直接复用。');
  }
  if (st === 'ANALYZING' || st === 'PENDING' || st === '') {
    return callout('','首次生成，将先分析产品身份',
      '<b>'+sku+'</b> 尚无 Product DNA 记录。提交后会依次调用：<br>① WF-29-L0 产品身份确认<br>② WF-29-L1-COSMO 人群画像<br>③ 本模块生成任务');
  }
  return callout('warn','DNA 状态需关注',
    '<b>'+sku+'</b> 的 DNA 状态为 <b>'+st+'</b>，请确认是否需要强制刷新。');
}

// 提交生成任务（product.generate 触发模块生图；有竞品 ASIN 时先触发 DNA/竞品分析）
async function submitTask(moduleKey){
  var input = document.querySelector('#page .form .ctl');
  var sku = input ? String(input.value || '').trim() : '';
  if (!sku) { alert('请先输入 SKU'); return; }
  var imgInput = document.querySelector('#page .form .ctl--img');
  var img = imgInput ? String(imgInput.value || '').trim() : '';
  if (!img) { alert('请先粘贴产品白底图链接（用于生成参考）'); return; }
  var asinInput = document.querySelector('#page .form .ctl--asin');
  var asinRaw = asinInput ? String(asinInput.value || '').trim() : '';
  var competitorIds = asinRaw ? asinRaw.split(/[,，\s]+/).filter(Boolean).slice(0,3) : [];
  // 有竞品 ASIN：先触发 DNA + COSMO + SORFTIME 竞品分析
  var known=await L4.fetch('product.get',{sku:sku});
  if (!known.success) {alert('产品查询失败：'+known.error);return;}
  if (competitorIds.length > 0 || !(known.data||[]).length) {
    var t = await L4.fetch('product.trigger', {
      sku: sku, market: 'US', product_name: sku,
      main_image_url: img, competitor_ids: competitorIds
    });
    if (!t.success) { alert('竞品分析触发失败：' + (t.error || '未知错误')); return; }
  }
  var mtInput = document.querySelector('#page .ctl--module-type');
  var moduleType = mtInput ? String(mtInput.value || '').trim() : '';
  var payload = {
    sku: sku, module: moduleKey, mode: 'scene',
    image_url: img,
    scene_descs: [{sceneSetting: 'the product in a modern minimalist setting with soft natural light, professional product photography'}],
    aspect_ratio: '1:1', quality: '1K',
    params: moduleType ? {module_type: moduleType} : {}
  };
  var quality=window._fieldValue('画质')||window._fieldValue('输出画质');
  payload.quality=quality.indexOf('2K')===0?'2K':'1K';
  var preference=window._fieldValue('生图模型偏好');
  payload.model_preference=preference.indexOf('GPT')>=0?'gpt-image-2':preference.indexOf('Gemini')>=0?'gemini-3-pro-image':'AUTO';
  payload.aspect_ratio=(window._fieldValue('画幅比例').match(/\d+:\d+/)||['1:1'])[0];
  var count=Math.min(8,parseInt(window._fieldValue('图片数量'),10)||1);
  if(moduleKey==='A-SCENE')payload.scene_descs=Array.from({length:count},function(_,i){return {sceneSetting:(window._fieldValue('场景风格')||'natural home setting')+'; distinct composition '+(i+1)};});
  if(moduleKey==='A-MODEL')payload.model_specs=Array.from({length:count},function(){return {modelRegion:window._fieldValue('模特地区'),bodyType:window._fieldValue('模特体型'),ageRange:window._fieldValue('模特年龄段')};});
  if(moduleKey==='F'){
    var theme=window._fieldValue('选定主题');
    payload.params.theme=theme;
    payload.params.scene_prompt=theme.indexOf('T-CUSTOM')===0?'Use the additional reference for theme, palette and composition only; preserve the first image product exactly.':theme;
    if(theme.indexOf('T-CUSTOM')===0){
      var file=document.querySelector('#page .ctl--theme-file');
      if(!file||!file.files.length){alert('自定义主题需选择参考图');return;}
      try{payload.params.theme_reference=await window._readImage(file.files[0]);}catch(e){alert(e.message);return;}
    }
  }
  var r = await L4.fetch('product.generate', payload);
  if (r.success) {
    alert('生成已返回：' + sku + '，请在「最近任务 / 素材资产库」查看实际结果。');
    render();
  } else {
    alert('提交失败：' + (r.error || '未知错误'));
  }
}

// 模块页共用结构
async function modulePage(opts){
  var sku = opts.sku || '';
  var fields = Array.isArray(opts.fields) ? opts.fields.join('') : opts.fields;
  var modKey = opts.moduleKey || opts.mod || '';
  var moduleNames={'A-SCENE':'A_SCENE_MODEL','A-MODEL':'A_SCENE_MODEL',B:'B_LISTING',C:'C_TIKTOK',D:'D_MAIN_IMAGE',E:'E_TEMU',F:'F_APLUS',G:'G_PATTERN'};
  var tr = await L4.fetch('product.task', {module: moduleNames[modKey] || modKey, limit: 5});
  var taskRows = (tr.data||[]).map(function(t){
    return [
      thumbImg(t.thumbnail_ref, 40),
      '<span class="m">'+String(t.id||'').slice(0,8)+'</span>',
      t.sku || '-',
      chip(t.status || '-', t.status==='SUCCESS'?'ok':(t.status==='FAILED'?'err':'warn')),
      t.module || '-',
      String(t.created_at||'').slice(0,16)
    ];
  });
  var taskTable = taskRows.length ? taskRows : [['<span class="ghost">暂无任务，提交后显示</span>','','','','','']];
  return (opts.noSKU ? '' :
    '<div class="form"><div class="fld"><label>SKU 选择</label>'+
    '<input class="ctl" value="'+sku+'" placeholder="输入SKU或从列表选择..."></div>'+
    '<div class="fld"><label>白底图 URL（可选）</label>'+
    '<input class="ctl ctl--img" placeholder="粘贴产品白底图链接，有图则同步触发 DNA 分析（约2-3分钟）"></div>'+
    '<div class="fld"><label>竞品 ASIN（可选，1-3 个，逗号分隔）</label>'+
    '<input class="ctl ctl--asin" placeholder="例如 B0G6K54D9F, B0C2K7DLVS"></div></div>'+
    await dnaCallout(sku)
  ) +
  panel('模块参数配置', '<div class="form g2">'+fields+'</div>') +
  '<div class="btnrow">'+
    '<button class="btn" onclick="submitTask(\''+modKey+'\')">提交生成任务</button>'+
    btn('保存本机草稿','btn--ghost',"window._saveDraft()")+btn('恢复草稿','btn--ghost',"window._loadDraft()")+
  '</div>' +
  panel('最近任务', table(['缩略图','任务ID','SKU','状态','模块','提交时间'], taskTable));
}

page('task-a-scene', {
  roles: ['*'],
  spec: {
    q: '模块A 场景图生成（源自项目02 场景图部分）',
    acts: ['选择SKU','配置场景参数','提交任务'],
    wf: ['WF-29-L0（首次SKU）','WF-29-L1-COSMO','模块A场景图工作流（源自02）','WF-29-L2-ENGINE'],
    reads: ['tenant_oldcat.product_identity','tenant_oldcat.product_dna','tenant_oldcat.cosmo_profile'],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['COSMO模式需Layer1完成，参考图模式可跳过']
  },
  guide: [
    '选择SKU后系统自动检测DNA状态，<b>首次SKU需等待约2min</b>完成Layer0+Layer1分析',
    'COSMO模式根据人群画像自动配场景；参考图模式上传2-5张参考图自定义',
    '场景图聚焦产品在真实使用环境中的呈现'
  ],
  body: function(){
    return modulePage({
      mod: 'A-SCENE',
      fields: [
        fld('图片数量', pick(['3张','5张(默认)','8张'])),
        fld('画幅比例', pick(['1:1 方图','4:5 竖图','9:16 超竖'])),
        fld('画质', pick(['1K 标准(默认)','2K 高清'])),
        fld('生成模式', pick(['COSMO模式(人群画像驱动)','参考图模式(上传2-5张)'])),
        fld('水印文案', txt('Built for Your Space',''), '留空则不加水印'),
        fld('场景风格', pick(['自动(从COSMO推断)','现代简约','温馨家居','北欧风','工业风']))
      ],
    });
  }
});

page('task-a-model', {
  roles: ['*'],
  spec: {
    q: '模块A 模特图生成（源自项目02 模特图部分）',
    acts: ['选择SKU','配置模特IA6参数','提交任务'],
    wf: ['WF-29-L0（首次SKU）','WF-29-L1-COSMO','模块A模特图工作流（源自02）','WF-29-L2-ENGINE'],
    reads: ['tenant_oldcat.product_identity','tenant_oldcat.product_dna','tenant_oldcat.cosmo_profile'],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['模特人设表(IA6)驱动，地区/体型/年龄段可从COSMO推断']
  },
  guide: [
    '选择SKU后系统自动检测DNA状态，<b>首次SKU需等待约2min</b>完成Layer0+Layer1分析',
    '模特IA6参数：地区/体型/年龄段，留空则从人群画像推断',
    '模特图聚焦产品在真人身上的展示效果'
  ],
  body: function(){
    return modulePage({
      mod: 'A-MODEL',
      fields: [
        fld('图片数量', pick(['3张','5张(默认)','8张'])),
        fld('画幅比例', pick(['1:1 方图','4:5 竖图','9:16 超竖'])),
        fld('画质', pick(['1K 标准(默认)','2K 高清'])),
        fld('模特地区', pick(['不限(从COSMO推断)','欧美','亚洲','非洲','拉美'])),
        fld('模特体型', pick(['不限','Slim','Athletic','Curvy','Plus'])),
        fld('模特年龄段', pick(['不限','18-25','25-35','35-45','45+'])),
        fld('拍摄角度', pick(['正面(默认)','侧面','3/4侧','多角度组合']))
      ],
    });
  }
});

page('task-b', {
  roles: ['*'],
  spec: {
    q: '模块B Listing全套图生成（源自项目06）',
    acts: ['选择SKU','配置输出通道','提交任务'],
    wf: ['WF-29-L0','WF-29-L1-COSMO','模块B自身工作流（源自06）','WF-29-L2-ENGINE'],
    reads: ['tenant_oldcat.product_dna','tenant_oldcat.cosmo_profile'],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['桌面+手机双通道会生成两套完整资产包']
  },
  body: function(){
    return modulePage({
      mod: 'B',
      fields: [
        fld('输出通道', pick(['桌面版(1500×1500)','手机版(1200×1200)','桌面+手机双通道'])),
        fld('生图模型偏好', pick(['自动选择(默认)','Gemini优先','GPT优先'])),
        fld('素材复用策略', pick(['优先复用资产库','全部重新生成'])),
        fld('备注', '<textarea class="ctl" rows="2" placeholder="选填：特殊要求或排除项..."></textarea>')
      ]
    });
  }
});

page('task-c', {
  roles: ['*'],
  spec: {
    q: '模块C TikTok Shop全套图生成（源自项目07）',
    acts: ['选择SKU','配置输出模式','提交任务'],
    wf: ['WF-29-L0','WF-29-L1-COSMO','模块C自身工作流（源自07）','WF-29-L2-ENGINE'],
    reads: ['tenant_oldcat.product_dna','tenant_oldcat.cosmo_profile'],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['shop_square与feed_vertical两模式画幅不同']
  },
  body: function(){
    return modulePage({
      mod: 'C',
      fields: [
        fld('输出模式', pick(['shop_square (1:1方图)','feed_vertical (9:16竖图)','两者都生成'])),
        fld('达人风格偏好', pick(['自动匹配COSMO','真实家居场景','测评开箱风','时尚街拍风'])),
        fld('UGC人设数量', pick(['1个人设(默认)','2个人设','3个人设'])),
        fld('水印', pick(['不加水印','Shop品牌水印','自定义文案']))
      ]
    });
  }
});

page('task-d', {
  roles: ['*'],
  spec: {
    q: '模块D 主图合规器（源自项目17-A）：输入任意棚拍图，输出合规主图',
    acts: ['上传棚拍图','设定合规阈值','提交检测'],
    wf: ['模块D自身工作流（源自17-A）','WF-29-L2-ENGINE(不合规时重生成)'],
    reads: [],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['不依赖SKU的DNA，直接处理任意产品图']
  },
  guide: [
    '<b>模块D与其他模块的关键差异：</b>输入是任意产品照片（不限SKU库存），不走Layer0/Layer1',
    '合规阈值默认90分，低于此分会调用Layer2重新生成主图',
    '已合规图片（≥90分）直接透传，不消耗生图额度'
  ],
  body: function(){
    return callout('','本模块独立于SKU身份库',
      '模块D处理任意产品照片的主图合规化，<b>不需要提前在产品身份库登记SKU</b>。上传图片后直接检测合规度。'
    ) +
    panel('图片上传与参数', '<div class="form">'+
      fld('棚拍图上传', '<input type="file" class="ctl" accept="image/*">')+
      fld('合规阈值', txt('90',''), '1-100分，低于此分触发Layer2重新生成')+
      fld('候选数量', pick(['1张(快速)','3张(推荐)','5张(多选)']))+
      fld('输出尺寸', pick(['2000×2000(亚马逊标准)','自定义...']))+
    '</div>') +
    '<div class="btnrow">'+btn('提交检测',null,"window._submitImage('D','主图合规检测')")+btn('批量上传（最多5张）','btn--ghost',"window._batchImages()")+'</div>' +
    panel('最近任务', table(
      ['任务ID','原图','合规分','状态','处理时间'],
      [
        ['<span class="m">TASK-D-20260819-008</span>','product_raw_1.jpg','<b style="color:var(--red)">68</b>',chip('已重生成','ok'),'14:35'],
        ['<span class="m">TASK-D-20260819-009</span>','product_raw_2.jpg','<b style="color:var(--gr-600)">94</b>',chip('合规透传','ok'),'14:42']
      ]
    ));
  }
});

page('task-e', {
  roles: ['*'],
  spec: {
    q: '模块E TEMU半托管详情图生成（源自项目19）',
    acts: ['选择SKU','配置AI披露合规开关','提交任务'],
    wf: ['WF-29-L0','WF-29-L1-COSMO','模块E自身工作流（源自19）','WF-29-L2-ENGINE'],
    reads: ['tenant_oldcat.product_dna','tenant_oldcat.cosmo_profile'],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['品类轨道自动检测触发不同模板']
  },
  body: function(){
    return modulePage({
      mod: 'E',
      fields: [
        fld('AI披露合规', pick(['clean(无水印,国内)','disclosure(AI标识,欧美)','internal(三档输出包)'])),
        fld('模特地区偏好', pick(['自动(从COSMO)','欧美','亚洲'])),
        fld('品类轨道', '<input class="ctl" value="AUTO_DETECT" readonly>', '系统自动检测（UPPER/LOWER/FULL/WAIST/其他）'),
        fld('备注', '<textarea class="ctl" rows="2" placeholder="特殊要求..."></textarea>')
      ]
    });
  }
});

page('task-f', {
  roles: ['*'],
  spec: {
    q: '模块F A+页面创意设计（源自项目22）',
    acts: ['选择SKU','选定主题','配置Lifestyle素材来源','提交任务'],
    wf: ['WF-29-L0','WF-29-L1-COSMO','模块F自身工作流（源自22）','WF-29-L2-ENGINE'],
    reads: ['tenant_oldcat.product_dna','tenant_oldcat.cosmo_profile','tenant_oldcat.theme_config'],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['T-CUSTOM自定义主题需上传参考图']
  },
  body: function(){
    return modulePage({
      mod: 'F',
      fields: [
        fld('A+图片类型', '<select class="ctl ctl--module-type"><option value="banner">Banner 横幅图</option><option value="lifestyle">Lifestyle 场景图</option><option value="detail">Detail 细节图</option><option value="comparison">Comparison 对比图</option><option value="whatsinbox">WhatsInBox 开箱图</option></select>'),
        fld('选定主题', pick(['T1-COASTAL','T2-FARMHOUSE','T3-CHRISTMAS','T4-HALLOWEEN','T-CUSTOM(自定义)'])),
        fld('自定义主题参考图', '<input type="file" class="ctl ctl--theme-file" accept="image/*">', '选择T-CUSTOM时必填，其他主题不使用此文件'),
        fld('Lifestyle素材来源', '<div style="display:grid;gap:8px">'+
          '<label style="display:flex;align-items:center;gap:8px"><input type="radio" name="lf" checked> 重新生成（调用Layer2）</label>'+
          '<label style="display:flex;align-items:center;gap:8px"><input type="radio" name="lf"> 从资产库选择（复用已有场景图）</label>'+
        '</div>'),
        fld('输出画质', pick(['1K 标准','2K 高清(推荐)']))
      ]
    });
  }
});

page('task-g', {
  roles: ['*'],
  spec: {
    q: '模块G 家居图案创意设计（源自项目21）：独立耦合，不依赖SKU身份',
    acts: ['上传参考图','配置原创度与拓展策略','提交任务'],
    wf: ['模块G自身工作流（源自21）','WF-29-L2-ENGINE'],
    reads: [],
    writes: ['tenant_oldcat.generated_assets'],
    limits: ['不调用Layer0/Layer1，独立于产品身份库']
  },
  guide: [
    '<b>模块G是独立耦合模块：</b>不依赖SKU身份库，直接上传2-5张参考图生成图案',
    '原创度控制：低(保留主要元素) / 中(结构创新) / 高(风格致敬)',
    '拓展策略可组合：改构图+改色系 = 既变布局又换配色'
  ],
  body: async function(){
    var recent=await L4.fetch('product.task',{module:'G_PATTERN',limit:5});
    return callout('','模块G无需手工创建SKU',
      '图案设计模块<b>不需要SKU</b>，直接上传参考图即可。适用场景：家居纺织品图案开发、季节性主题创新。'
    ) +
    panel('参考图上传与参数', '<div class="form">'+
      fld('参考图上传', '<input type="file" class="ctl" accept="image/*" multiple>', '2-5张，系统会提取共性元素')+
      fld('原创度', pick(['低(保留主要元素)','中(结构创新,推荐)','高(风格致敬)']))+
      fld('拓展策略', '<div style="display:grid;gap:6px">'+
        '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox"> 改构图（重新排布元素）</label>'+
        '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox"> 改主题（如花卉→几何）</label>'+
        '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked> 改色系（保留形态换配色）</label>'+
        '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox"> 混合以上策略</label>'+
      '</div>')+
      fld('输出画质', pick(['1K','2K(推荐)']))+
      fld('生图模型', pick(['自动选择','Gemini优先','GPT优先']))+
    '</div>') +
    '<div class="btnrow">'+btn('提交生成',null,"window._submitImage('G','图案生成')")+btn('保存本机配置','btn--ghost',"window._saveDraft()")+btn('恢复配置','btn--ghost',"window._loadDraft()")+'</div>' +
    panel('最近任务', table(
      ['任务ID','状态','实际模型','成本','提交时间'],
      (recent.data||[]).map(function(x){return [x.id,x.status,x.effective_model,x.cost_estimate_usd,x.created_at].map(ledgerEscape);})
    ));
  }
});

page('task-f-preview', {
  roles: ['*'],
  spec: {
    q: 'A+ 页面预览拼装：按 A+ 五模块漏斗顺序把已生成的模块图拼成可预览、可导出的 HTML（01 PRD §7.4.6）',
    acts: ['选择产品','切换桌面/手机通道','查看缺失模块','导出 HTML'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generated_assets'],
    limits: ['只做拼装与预览，不生成图片；Comparison 必须同品牌变体对比（不得用竞品）']
  },
  guide: [
    '拼装顺序即 A+ 五模块漏斗：Banner → Lifestyle → Detail → Comparison → WhatsInBox',
    '桌面通道 970px / 手机通道 600px，只切换预览宽度，不改素材本身',
    '<b>Comparison 合规红线</b>：同品牌不同变体对比，禁用竞品对比；导出前请人工确认',
    '缺失模块显示占位并可跳转「A+页面设计」补生成'
  ],
  body: async function(){
    var CH = 'desktop';
    try { CH = sessionStorage.getItem('vf_aplus_ch') || 'desktop'; } catch(e){}
    var W = CH === 'mobile' ? 600 : 970;

    var pr = await L4.fetch('product.list', {limit: 200});
    if (!pr.success) return callout('warn', '数据加载失败', pr.error || '未知错误');
    var prods = (pr.data || []).map(function(it){ return it.identity || {}; }).filter(function(x){ return x.id && x.sku; });
    if (!prods.length) return ghost('暂无产品，请先在产品身份库录入');

    var cur = '';
    try { cur = sessionStorage.getItem('vf_aplus_pid') || ''; } catch(e){}
    var prod = null;
    for (var i = 0; i < prods.length; i++) { if (String(prods[i].id) === String(cur)) { prod = prods[i]; break; } }
    if (!prod) {
      /* 默认优先选「已有 A+ 素材」的商品 —— 否则一进页面就是一堆「未生成」占位，像坏了 */
      try {
        var probe = await L4.fetch('assets.list', {module: 'F_APLUS', limit: 200});
        if (probe.success && (probe.data || []).length) {
          var havePid = [];
          (probe.data || []).forEach(function(a){
            var pv = String(a.product_identity_id || '');
            if (pv && havePid.indexOf(pv) < 0) havePid.push(pv);
          });
          for (var j = 0; j < prods.length; j++) {
            if (havePid.indexOf(String(prods[j].id)) >= 0) { prod = prods[j]; break; }
          }
        }
      } catch (e) {}
    }
    if (!prod) prod = prods[0];

    /* 素材来源：该商品在 F_APLUS 模块下的已生成资产（image_type = banner/lifestyle/detail/comparison/whatsinbox） */
    var ar = await L4.fetch('assets.list', { product_identity_id: prod.id, module: 'F_APLUS', limit: 200 });
    if (!ar.success) return callout('warn', '素材加载失败', ar.error || '未知错误');
    var assets = ar.data || [];

    var byType = {};
    assets.forEach(function(a){
      var k = String(a.image_type || '').toLowerCase();
      if (!byType[k]) byType[k] = a;
    });

    function imgUrl(u, w){
      var s = String(u || '');
      if (!s) return '';
      if (s.indexOf('?') >= 0) return s;
      return s + '?x-oss-process=image/resize,w_' + w;
    }

    var OPTS = prods.map(function(pp){
      return '<option value="' + pp.id + '"' + (String(pp.id) === String(prod.id) ? ' selected' : '') + '>' + pp.sku + (pp.market ? ' (' + pp.market + ')' : '') + '</option>';
    }).join('');

    var MODS = [
      ['banner', 'Banner 横幅', '模块 1 · 品牌开场 / 主视觉'],
      ['lifestyle', 'Lifestyle 场景', '模块 2 · 生活场景代入'],
      ['detail', 'Detail 细节', '模块 3 · 材质与工艺细节'],
      ['comparison', 'Comparison 对比', '模块 4 · 同品牌变体对比（合规：不得用竞品）'],
      ['whatsinbox', 'WhatsInBox 开箱', '模块 5 · 包装清单']
    ];

    var missing = [];
    var blocks = MODS.map(function(m){
      var a = byType[m[0]];
      if (!a) {
        missing.push(m[1]);
        return '<div style="border:1px dashed #d9d9d9;border-radius:10px;padding:22px;text-align:center;color:#8c8c8c;margin:10px 0">'
          + '<div style="font-weight:600;color:#595959">' + m[1] + ' · 未生成</div>'
          + '<div style="font-size:12.5px;margin-top:6px">' + m[2] + '</div>'
          + '<div style="margin-top:10px"><a href="#task-f" style="color:#1677ff">去「A+页面设计」生成</a></div></div>';
      }
      return '<div style="margin:10px 0">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#8c8c8c;margin-bottom:6px;gap:10px">'
        + '<span><b style="color:#262626">' + m[1] + '</b> · ' + m[2] + '</span>'
        + '<span style="white-space:nowrap">' + (a.effective_model || '-') + ' · ' + (a.quality || '-') + ' · ' + String(a.generated_at || '').slice(0, 16) + '</span>'
        + '</div>'
        + '<img src="' + imgUrl(a.storage_ref, W) + '" style="width:100%;display:block;border:1px solid #eee;border-radius:8px" loading="lazy" alt="' + m[1] + '">'
        + '</div>';
    }).join('');

    var preview = '<div style="overflow-x:auto"><div style="width:' + W + 'px;max-width:100%;background:#fff;padding:14px;border:1px solid #eee;border-radius:12px">'
      + blocks + '</div></div>';

    var exportHtml = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>A+ 页面预览 · ' + prod.sku + '</title>'
      + '<style>body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;margin:0;background:#f5f6f6}'
      + '.wrap{width:' + W + 'px;margin:0 auto;background:#fff;padding:16px;box-sizing:border-box}'
      + '.mod{margin:14px 0}.cap{font-size:12.5px;color:#8c8c8c;margin-bottom:6px}img{width:100%;display:block;border-radius:8px}'
      + '.miss{border:1px dashed #d9d9d9;padding:24px;text-align:center;color:#8c8c8c;border-radius:8px}'
      + '</style></head><body><div class="wrap">'
      + '<h2 style="font-size:16px;margin:0 0 4px">A+ 页面预览拼装 · ' + prod.sku + '（' + (prod.market || '-') + '）</h2>'
      + '<div class="cap">按 A+ 五模块漏斗顺序拼装 · 导出时间 ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '</div>'
      + '<div class="cap" style="color:#c0392b">Comparison 须为同品牌变体对比，禁止竞品对比（亚马逊合规红线）</div>'
      + MODS.map(function(m){
          var a = byType[m[0]];
          return '<div class="mod"><div class="cap">' + m[1] + ' · ' + m[2] + '</div>'
            + (a ? '<img src="' + (a.storage_ref || '') + '" alt="' + m[1] + '">' : '<div class="miss">未生成</div>')
            + '</div>';
        }).join('')
      + '</div></body></html>';

    window.__aplusHtml = exportHtml;
    window.__aplusSku = String(prod.sku || 'product');

    var head = panel('选择产品与预览通道',
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">'
      + '<select class="ctl" style="min-width:240px" onchange="window._pickAplusProduct(this.value)">' + OPTS + '</select>'
      + '<span style="font-size:12.5px;color:#8c8c8c">预览通道</span>'
      + '<button class="btn ' + (CH === 'desktop' ? '' : 'btn--ghost') + '" onclick="window._setAplusChannel(\'desktop\')">桌面 970px</button>'
      + '<button class="btn ' + (CH === 'mobile' ? '' : 'btn--ghost') + '" onclick="window._setAplusChannel(\'mobile\')">手机 600px</button>'
      + '<button class="btn btn--ghost" onclick="window._exportAplusHtml()">导出 HTML</button>'
      + '</div>');

    var status = panel('五模块生成状态',
      kv([
        ['产品', String(prod.sku || '-') + '（' + (prod.market || '-') + '）'],
        ['已生成模块', String(5 - missing.length) + ' / 5'],
        ['缺失模块', missing.length ? missing.join('、') : '无'],
        ['F_APLUS 素材总数', String(assets.length) + ' 张']
      ]));

    return head + status + panel('A+ 页面预览（' + (CH === 'mobile' ? '手机 600px' : '桌面 970px') + '）', preview,
      {note: missing.length ? ('缺失 ' + missing.length + ' 个模块，导出后对应位置会显示「未生成」占位') : '五模块齐全，可直接导出交付'})
      + callout('', '拼装说明', '本页只做<b>拼装与预览</b>，不生成图片：数据来自 A+ 素材（<span class="m">module=F_APLUS</span>）'
        + '按 image_type 归位到五模块漏斗。同一模块有多张时取最新一张。「导出 HTML」产出可直接打开的独立文件，'
        + '便于评审与交付；<b>Comparison 合规需人工复核</b>。');
  }
});
page('task-pipeline', {
  roles: ['*'],
  spec: {
    q: '任务流水线详情：用真实台账还原跨层调用链，展示 skip/done/now/wait 四态',
    acts: ['选择任务','查看真实执行链路','下钻到产出资产'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger','tenant_oldcat.generated_assets','tenant_oldcat.product_identity'],
    limits: ['链路按台账 layer/module 归组；成本明细限系统管理员查看']
  },
  guide: [
    '链路数据来自 <b>generation_ledger</b> 真实台账，按该任务所属商品的行按层归组',
    '某层显示「已跳过/未执行」= 台账里没有这一层的调用记录（缓存复用或该层未启用）',
    '成本为估算值，真实费用以模型服务商账单为准'
  ],
  body: async function(){
    var tr = await L4.fetch('product.task', {limit: 200});
    if (!tr.success) return callout('warn', '数据加载失败', tr.error || '未知错误');
    var tasks = tr.data || [];
    if (!tasks.length) return ghost('暂无任务记录，先跑一次生成模块后回来查看');

    var cur = sessionStorage.getItem('vf_cur_task') || '';
    var task = null;
    for (var i = 0; i < tasks.length; i++) { if (String(tasks[i].id) === String(cur)) { task = tasks[i]; break; } }
    if (!task) task = tasks[0];

    var opts = tasks.slice(0, 100).map(function(t){
      return '<option value="' + t.id + '"' + (String(t.id) === String(task.id) ? ' selected' : '') + '>'
        + (t.sku || '-') + ' / ' + (t.module || '-') + ' / ' + String(t.created_at || '').slice(0, 16) + '</option>';
    }).join('');
    var picker = panel('选择任务', '<select class="ctl" style="max-width:580px" onchange="window._pickTask(this.value)">' + opts + '</select>');

    var meta = panel('任务元数据', '<div style="display:flex;gap:16px;align-items:flex-start">'
      + thumbImg(task.thumbnail_ref, 96)
      + '<div style="flex:1">' + kv([
        ['任务ID', '<span class="m">' + String(task.id || '-') + '</span>'],
        ['SKU', task.sku || '-'],
        ['市场', task.market || '-'],
        ['模块', task.module || '-'],
        ['当前层级', task.layer || '-'],
        ['状态', chip(task.status || '-', task.status === 'SUCCESS' ? 'ok' : (task.status === 'FAILED' ? 'fail' : 'warn'))],
        ['实际模型', task.effective_model || task.requested_model || '-'],
        ['耗时', task.duration_ms != null ? (task.duration_ms + ' ms') : '-'],
        ['成本估算', task.cost_estimate_usd != null ? ('$' + task.cost_estimate_usd) : '（需系统管理员权限）'],
        ['提交时间', String(task.created_at || '-').slice(0, 19)],
        ['错误原因', task.error_message || '-']
      ]) + '</div></div>');

    var lr = await L4.fetch('ledger.list', {limit: 200});
    if (!lr.success) return picker + meta + callout('', '链路明细未开放给当前角色',
      '成本台账明细限<b>系统管理员</b>查看。当前角色可见任务元数据与产出资产，链路视图请用系统管理员账号登录。');

    var all = lr.data || [];
    var rows = all.filter(function(r){ return String(r.product_identity_id || '') === String(task.product_identity_id || ''); });
    if (!rows.length) return picker + meta + ghost('该商品名下暂无台账明细（可能只跑了识别层，或本次调用未记台账）');

    function sumOf(list, k){ var s = 0; for (var q = 0; q < list.length; q++) { s += Number(list[q][k] || 0); } return s; }
    function stOf(list){
      var hf = false, hr = false, ho = false;
      for (var q = 0; q < list.length; q++) {
        var s = String(list[q].status || '');
        if (s === 'FAILED' || s === 'PARTIAL') { hf = true; } else if (s === 'SUCCESS') { ho = true; } else { hr = true; }
      }
      if (hf) return 'fail';
      if (hr) return 'run';
      if (ho) return 'done';
      return 'wait';
    }
    function mk(no, t, s, list){
      var st = stOf(list);
      var badge = st === 'done' ? chip(list.length + ' 次调用', 'ok')
                : st === 'fail' ? chip('失败', 'fail')
                : st === 'run' ? chip('进行中', 'warn') : chip('未执行', 'neutral');
      var steps = list.map(function(r){
        return [st, String(r.effective_model || r.requested_model || r.layer || '-'),
          String(r.status || '') + (r.fallback_reason ? (' / ' + r.fallback_reason) : ''),
          (r.duration_ms != null ? (r.duration_ms + 'ms') : '') + (r.cost_estimate_usd != null ? (' / $' + r.cost_estimate_usd) : '')];
      });
      if (!steps.length) steps = [['wait', '该层无调用记录', '台账中没有这一层（缓存复用，或该层未落台账）', '-']];
      return { no: no, t: t, s: s, state: st, time: list.length ? (sumOf(list, 'duration_ms') + ' ms') : '-', chip: badge, steps: steps };
    }
    function byLayer(l){ return rows.filter(function(r){ return String(r.layer || '') === l; }); }
    function byModule(m){ return rows.filter(function(r){ return String(r.module || '') === m; }); }

    var stages = [];
    stages.push(mk('0', '产品身份确认', 'WF-29-L0 / Product DNA', byLayer('LAYER0')));
    stages.push(mk('1', '人群画像分析', 'WF-29-L1-COSMO', byLayer('LAYER1_COSMO')));
    stages.push(mk('1', '竞品情报采集', 'WF-29-L1-SORFTIME', byLayer('LAYER1_SORFTIME')));
    stages.push(mk('2', '业务模块编排', String(task.module || '业务模块'), byModule(String(task.module || ''))));
    stages.push(mk('3', 'Layer2 统一生图引擎', '统一生图引擎 / 实际出图', byLayer('LAYER2')));

    return picker + meta + phaseFlow(stages)
      + callout('', '口径说明', '链路按 generation_ledger 真实台账还原：「未执行」= 台账无该层记录，'
        + '「进行中」= 该层有未完成调用，「失败」= 含 FAILED/PARTIAL 行。成本为估算值。');
  }
});

/* ══ 注册完整性自检 ══
   ③ 生成任务组: task-a, task-b, task-c, task-d, task-e, task-f, task-g, task-pipeline (8)
   共8页 ✓ */
