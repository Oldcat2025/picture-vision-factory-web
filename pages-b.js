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

// 提交生成任务（product.generate 触发模块生图；首次 SKU 需先有 DNA）
async function submitTask(moduleKey){
  var input = document.querySelector('#page .form .ctl');
  var sku = input ? String(input.value || '').trim() : '';
  if (!sku) { alert('请先输入 SKU'); return; }
  var imgInput = document.querySelector('#page .form .ctl--img');
  var img = imgInput ? String(imgInput.value || '').trim() : '';
  if (!img) { alert('请先粘贴产品白底图链接（用于生成参考）'); return; }
  var payload = {
    sku: sku, module: moduleKey, mode: 'scene',
    image_url: img,
    scene_descs: [{sceneSetting: 'the product in a modern minimalist setting with soft natural light, professional product photography'}],
    aspect_ratio: '1:1', quality: '1K'
  };
  var r = await L4.fetch('product.generate', payload);
  if (r.success) {
    alert('已提交生成任务：' + sku + '，正在生成图片（约 30-60 秒），完成后可在「最近任务 / 素材资产库」查看。');
    render();
  } else {
    alert('提交失败：' + (r.error || '未知错误'));
  }
}

// 模块页共用结构
async function modulePage(opts){
  var sku = opts.sku || 'SKU-VASE-042';
  var fields = Array.isArray(opts.fields) ? opts.fields.join('') : opts.fields;
  var modKey = opts.moduleKey || '';
  var tr = await L4.fetch('product.task', {module: modKey, limit: 5});
  var taskRows = (tr.data||[]).map(function(t){
    return [
      '<span class="m">'+String(t.id||'').slice(0,8)+'</span>',
      t.sku || '-',
      chip(t.status || '-', t.status==='SUCCESS'?'ok':(t.status==='FAILED'?'err':'warn')),
      t.module || '-',
      String(t.created_at||'').slice(0,16)
    ];
  });
  var taskTable = taskRows.length ? taskRows : [['<span class="ghost">暂无任务，提交后显示</span>','','','','']];
  return (opts.noSKU ? '' :
    '<div class="form"><div class="fld"><label>SKU 选择</label>'+
    '<input class="ctl" value="'+sku+'" placeholder="输入SKU或从列表选择..."></div>'+
    '<div class="fld"><label>白底图 URL（可选）</label>'+
    '<input class="ctl ctl--img" placeholder="粘贴产品白底图链接，有图则同步触发 DNA 分析（约2-3分钟）"></div></div>'+
    await dnaCallout(sku)
  ) +
  panel('模块参数配置', '<div class="form g2">'+fields+'</div>') +
  '<div class="btnrow">'+
    '<button class="btn" onclick="submitTask(\''+modKey+'\')">提交生成任务</button>'+
    btn('保存草稿','btn--ghost')+
  '</div>' +
  panel('最近任务', table(['任务ID','SKU','状态','模块','提交时间'], taskTable));
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
      sku: 'SKU-VASE-042',
      fields: [
        fld('图片数量', pick(['3张','5张(默认)','8张'])),
        fld('画幅比例', pick(['1:1 方图','4:5 竖图','9:16 超竖'])),
        fld('画质', pick(['1K 标准(默认)','2K 高清'])),
        fld('生成模式', pick(['COSMO模式(人群画像驱动)','参考图模式(上传2-5张)'])),
        fld('水印文案', txt('Built for Your Space',''), '留空则不加水印'),
        fld('场景风格', pick(['自动(从COSMO推断)','现代简约','温馨家居','北欧风','工业风']))
      ],
      tasks: [
        ['<span class="m">TASK-A-SCENE-20260819-001</span>','SKU-VASE-042',chip('已完成','ok'),'5','2026-08-19 14:22'],
        ['<span class="m">TASK-A-SCENE-20260819-002</span>','SKU-VASE-042','<div class="bar gr"><i style="width:70%"></i></div> 70%','3/5','2026-08-19 15:08']
      ]
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
      sku: 'SKU-VASE-042',
      fields: [
        fld('图片数量', pick(['3张','5张(默认)','8张'])),
        fld('画幅比例', pick(['1:1 方图','4:5 竖图','9:16 超竖'])),
        fld('画质', pick(['1K 标准(默认)','2K 高清'])),
        fld('模特地区', pick(['不限(从COSMO推断)','欧美','亚洲','非洲','拉美'])),
        fld('模特体型', pick(['不限','Slim','Athletic','Curvy','Plus'])),
        fld('模特年龄段', pick(['不限','18-25','25-35','35-45','45+'])),
        fld('拍摄角度', pick(['正面(默认)','侧面','3/4侧','多角度组合']))
      ],
      tasks: [
        ['<span class="m">TASK-A-MODEL-20260819-003</span>','SKU-VASE-042',chip('已完成','ok'),'5','2026-08-19 14:35'],
        ['<span class="m">TASK-A-MODEL-20260819-004</span>','SKU-VASE-042','<div class="bar gr"><i style="width:85%"></i></div> 85%','4/5','2026-08-19 15:20']
      ]
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
    '<div class="btnrow">'+btn('提交检测')+btn('批量上传','btn--ghost')+'</div>' +
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
        fld('选定主题', pick(['T1-COASTAL','T2-FARMHOUSE','T3-CHRISTMAS','T4-HALLOWEEN','T-CUSTOM(自定义)'])),
        fld('自定义主题参考图', '<input type="file" class="ctl" accept="image/*" disabled>', '仅T-CUSTOM时启用'),
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
  body: function(){
    return callout('','模块G独立于SKU身份库',
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
      fld('输出画质', pick(['1K','2K(推荐)','4K(打样)']))+
      fld('生图模型', pick(['自动选择','Gemini优先','GPT优先']))+
    '</div>') +
    '<div class="btnrow">'+btn('提交生成')+btn('保存配置','btn--ghost')+'</div>' +
    panel('最近任务', table(
      ['任务ID','参考图数','原创度','候选数','提交时间'],
      [
        ['<span class="m">TASK-G-20260819-001</span>','3','中','5','2026-08-19 11:20'],
        ['<span class="m">TASK-G-20260818-005</span>','4','高','8','2026-08-18 16:32']
      ]
    ));
  }
});

page('task-pipeline', {
  roles: ['*'],
  spec: {
    q: '任务流水线详情：跨层调用链可视化，展示skip/done/now/wait四态',
    acts: ['查看任务执行链路','识别跳过态复用','下钻到子步骤'],
    wf: ['WF-29-L4-API'],
    reads: ['tenant_oldcat.generation_ledger','tenant_oldcat.generated_assets'],
    limits: ['历史任务只读，运行中任务可取消']
  },
  guide: [
    '流程图中<b>"已跳过·复用"</b>标签表示该阶段使用了缓存数据，未实际调用',
    'Layer2被多次调用（如生成5张图）时展开为嵌套子步骤',
    '点击各阶段可跳转到对应产出资产详情'
  ],
  body: function(){
    return panel('任务元数据', kv([
      ['任务ID','TASK-A-20260819-005'],
      ['模块','模块A 场景图+模特图'],
      ['SKU','SKU-VASE-042'],
      ['提交时间','2026-08-19 14:52'],
      ['完成时间','2026-08-19 14:55 (耗时3m12s)'],
      ['总成本估算','$0.85']
    ])) +
    phaseFlow([
      {no:'0',t:'产品身份确认',s:'WF-29-L0 · Product DNA',state:'skip',time:'0ms',
        chip:skiptag('已跳过 · 复用'),
        steps:[
          ['skip','调用WF-29-L0','DNA缓存命中，跳过','0ms'],
          ['skip','写入product_dna表','跳过','0ms']
        ]
      },
      {no:'1',t:'人群画像分析',s:'WF-29-L1-COSMO · Demographics',state:'skip',time:'0ms',
        chip:skiptag('已跳过 · 复用'),
        steps:[
          ['skip','调用WF-29-L1-COSMO','COSMO缓存命中','0ms'],
          ['skip','写入cosmo_profile表','跳过','0ms']
        ]
      },
      {no:'2',t:'模块A业务编排',s:'场景图+模特图prompt构建',state:'done',time:'850ms',
        chip:chip('已完成','ok'),
        steps:[
          ['done','读取Product DNA','从缓存加载','120ms'],
          ['done','读取COSMO Profile','从缓存加载','95ms'],
          ['done','构建prompt（5张图）','IA6参数应用','635ms']
        ]
      },
      {no:'3',t:'Layer2统一生图引擎',s:'Gemini 2.5-flash · 5次调用',state:'done',time:'68.2s',
        chip:chip('5/5','ok'),
        steps:[
          ['done','图1生成','prompt_A1 → asset-3f8a12','12.8s'],
          ['done','图2生成','prompt_A2 → asset-4b9c23','13.2s'],
          ['done','图3生成','prompt_A3 → asset-5d1e34','14.1s'],
          ['done','图4生成','prompt_A4 → asset-6f2g45','13.5s'],
          ['done','图5生成','prompt_A5 → asset-7h3i56','14.6s']
        ]
      },
      {no:'4',t:'资产入库与通知',s:'写generated_assets表',state:'done',time:'420ms',
        chip:chip('已完成','ok'),
        steps:[
          ['done','批量写入assets表','5条记录','280ms'],
          ['done','更新ledger台账','cost=$0.85','85ms'],
          ['done','发送完成通知','飞书消息','55ms']
        ]
      }
    ]) +
    panel('产出资产', table(
      ['资产ID','类型','模型','耗时','成本','操作'],
      [
        ['<span class="m">asset-3f8a12</span>','场景图','gemini-2.5-flash','12.8s','$0.17',btn('查看','btn--ghost')],
        ['<span class="m">asset-4b9c23</span>','场景图','gemini-2.5-flash','13.2s','$0.17',btn('查看','btn--ghost')],
        ['<span class="m">asset-5d1e34</span>','模特图','gemini-2.5-flash','14.1s','$0.17',btn('查看','btn--ghost')],
        ['<span class="m">asset-6f2g45</span>','模特图','gemini-2.5-flash','13.5s','$0.17',btn('查看','btn--ghost')],
        ['<span class="m">asset-7h3i56</span>','场景图','gemini-2.5-flash','14.6s','$0.17',btn('查看','btn--ghost')]
      ]
    ));
  }
});

/* ══ 注册完整性自检 ══
   ③ 生成任务组: task-a, task-b, task-c, task-d, task-e, task-f, task-g, task-pipeline (8)
   共8页 ✓ */
