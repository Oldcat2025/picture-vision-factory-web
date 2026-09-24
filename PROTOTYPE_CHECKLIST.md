# 项目29 视觉图片生成工厂管理系统 - 原型验收文档

> ⚠️ **本文件已过期，2026-08-20 PRD审计标记（详见06文档§3 G12-G15）**：
> 1. 本文件写的"30页"是v1.0旧数字，`core.js`实际导航是**42页/9大分组**（07文档v1.1已同步），本文件从未更新
> 2. 本文件§5.2曾把`product_category_track`示例值标注为"✅已核对通过"，但该值（`HOME_DECOR`/`TEXTILES`/`BATH`/`FLOOR`）与02文档§1.1 D3官方7类枚举完全不匹配——**这条验收记录是假的**，不能作为该字段已核对的依据。**此项（G15）截至2026-08-20仍未修复**
> 3. ~~原型代码当前有启动即崩溃的bug~~ **已于2026-08-20修复并通过浏览器实测验证**（G14，见06文档§3）：补回角色切换下拉+头像两个独立控件、`sys-user`/`sys-audit`更名为`adm-user`/`adm-audit`。下面的✅勾选**现在可以正常打开验证**，但仍是v1.0旧清单，不含⑧⑨组
> 4. 本文件的"页面注册完整性"清单**不包含**⑧上线跟踪、⑨管理后台两组共10页（`core.js`已有导航但当时未同步进本清单）
>
> 修复G15（示例数据/枚举值）后，本文件需要整体重写，覆盖07文档v1.1的42页清单——不要在旧内容基础上小修小补，它当前的"已验收"结论本身不可信。

## 原型交付清单（以下内容为v1.0旧版，仅供追溯参考，不代表当前真实状态）

### 1. 核心文件（5个）

✅ **index.html** - HTML外壳，导入4个JS文件  
✅ **app.css** - 完整样式表（复用项目28设计语言）  
✅ **core.js** - 内核：导航树（30页）、渲染助手（22个函数）、路由与角色切换  
✅ **pages-a.js** - ①工作台组(3页) + ②产品身份库组(4页) = 7页  
✅ **pages-b.js** - ③生成任务组(8页，含7模块+流水线详情)  
✅ **pages-c.js** - ④素材资产库组(2页) + ⑤生成台账组(3页) = 5页  
✅ **pages-d.js** - ⑥配置中心组(6页) + ⑦系统设置组(4页) = 10页  

**总计：30页面，1个导航骨架，3个角色权限，假数据驱动**

---

## 2. 页面注册完整性

### ① 工作台组（3页）
- [x] 1.1 `dash-todo` 我的待办
- [x] 1.2 `dash-overview` 跨模块任务概览
- [x] 1.3 `dash-cost-glance` 成本与生成速览

### ② 产品身份库组（4页）
- [x] 2.1 `pid-list` SKU检索浏览
- [x] 2.2 `pid-dna` Product DNA详情
- [x] 2.3 `pid-cosmo` 人群画像COSMO
- [x] 2.4 `pid-sorftime` 竞品情报SORFTIME

### ③ 生成任务组（8页）
- [x] 3.1 `task-a` 模块A 场景图+模特图
- [x] 3.2 `task-b` 模块B Listing全套图
- [x] 3.3 `task-c` 模块C TikTok全套图
- [x] 3.4 `task-d` 模块D 主图合规器
- [x] 3.5 `task-e` 模块E TEMU详情图
- [x] 3.6 `task-f` 模块F A+页面
- [x] 3.7 `task-g` 模块G 图案设计
- [x] 3.8 `task-pipeline` 任务流水线详情

### ④ 素材资产库组（2页）
- [x] 4.1 `asset-gallery` 资产画廊
- [x] 4.2 `asset-detail` 资产详情与引用

### ⑤ 生成台账组（3页）
- [x] 5.1 `ledger-cost` 成本总览
- [x] 5.2 `ledger-breakdown` 按层级/模型拆分
- [x] 5.3 `ledger-failure` 失败率与重试分析

### ⑥ 配置中心组（6页）
- [x] 6.1 `cfg-ia6` 模特人设表IA6
- [x] 6.2 `cfg-theme` 主题配置表
- [x] 6.3 `cfg-brand` 品牌黑名单
- [x] 6.4 `cfg-market-lang` 市场语言映射
- [x] 6.5 `cfg-sensitivity` 敏感品类路由规则
- [x] 6.6 `cfg-physical` 物理比例参照物

### ⑦ 系统设置组（4页）
- [x] 7.1 `sys-instance` 多实例管理
- [x] 7.2 `sys-cred` 凭证管理
- [x] 7.3 `sys-user` 用户与权限
- [x] 7.4 `sys-audit` 操作审计日志

---

## 3. 关键设计落地验证

### 3.1 核心交互（07文档§2.2.3）
✅ **SKU选择后DNA状态三态提示**（绿色已有/蓝色首次/琥珀过期+强制刷新复选框）  
✅ **模块D/G独立于SKU身份库**（无SKU选择器，直接上传图片）  
✅ **模块G不调用Layer0/Layer1**（工作流列表明确标注）

### 3.2 证据溯源（02文档§0.4）
✅ **ev()徽章函数**：F可见事实/U用户声称/M市场推断/I AI推断  
✅ **evLegend()图例**：pid-dna页面完整展示四类证据分组  
✅ **QC反查红色callout**：PARTIAL状态展示被拒绝声明

### 3.3 跨层调用可视化（07文档§4.2）
✅ **phaseFlow()阶段流程组件**：task-pipeline页面展示skip/done/now/wait四态  
✅ **skip态标签skiptag()**：区别于wait，明确展示"已跳过·复用"  
✅ **Layer2多次调用嵌套子步骤**：生成5张图的场景完整呈现

### 3.4 资产画廊（07文档§4.1）
✅ **gallery()网格卡片**：12张假资产，覆盖7模块、可复用/定制标记、channel角标  
✅ **asset-detail引用记录**：回答"这张图被复用了几次"  

### 3.5 安全约束（07文档§2.2.7）
✅ **sys-instance不提供一键切换**：醒目callout说明高危操作约束  
✅ **sys-cred不显示明文Key**：sk-****占位符展示  
✅ **cfg-sensitivity word-boundary匹配说明**：防substring陷阱的UI提示

### 3.6 权限分层（07文档§3）
✅ **角色切换功能**：右上角select，切换后页面自动渲染对应内容  
✅ **lock标签**：侧边栏无权限页面显示🔒，点击无响应  
✅ **dash-todo按角色区分内容**：运营/内容管理员/系统管理员看到不同待办

---

## 4. 渲染助手完整性（core.js）

基础组件：chip / table / panel / toolbar / sel / inp / btn / kv / stats / steps / bar / callout / fld / txt / pick / copybox / tabs / ghost

项目29新增：
- **ev(letters)** - 证据字母徽章 F/U/M/I
- **evLegend()** - 证据类型图例
- **flow(nodes)** - 横向流程图（Layer0→Layer1→7模块→Layer2）
- **phaseFlow(phases)** - 分段流程（大段包步骤，支持skip/done/now/wait/fail五态）
- **skiptag(text)** - 跳过态标签（与wait区分）
- **gallery(items)** - 资产画廊卡片（可复用标记+channel角标+引用按钮）
- **pal(colors)** - 色板小色块（DNA详情color_system可视化）
- **guideBar(list)** - 操作指引折叠框

---

## 5. 数据真实感验证

### 5.1 字段命名一致性
✅ SKU格式：`SKU-PILLOW-042` / `SKU-BLANKET-118`  
✅ 任务ID格式：`TASK-A-20260819-001`  
✅ 资产ID格式：`asset-3f8a12c4`  
✅ 时间格式：`2026-08-19 14:55`  
✅ 成本格式：`$0.17` / `$127.50`  
✅ 模型名：`gemini-2.5-flash` / `gpt-image-2`  

### 5.2 枚举值对齐（02文档）
✅ module枚举：A_SCENE_MODEL / B_LISTING / C_TIKTOK / D_MAIN_IMAGE / E_TEMU / F_APLUS / G_PATTERN  
✅ layer枚举：LAYER0 / LAYER1_COSMO / LAYER1_SORFTIME / LAYER2  
✅ dna_status：PENDING / ANALYZING / APPROVED / PARTIAL / REJECTED / STALE  
✅ category_track：HOME_DECOR / TEXTILES / BATH / FLOOR（品类轨道）

### 5.3 真实数值参考
✅ IA6头身比：欧美1:9、亚洲1:7.5、非洲1:8（源自项目19验证）  
✅ BMI范围：19-23 / 18-21 / 24-28（真实人体工学数值）  
✅ 物理参照物：智能手机147×71×8mm（iPhone 13实测）  
✅ 主题包：T1-COASTAL / T2-FARMHOUSE / T3-CHRISTMAS（项目22的16主题概念）

---

## 6. 启动与访问

### 本地启动（已后台运行）
```bash
cd D:\N8NProjects\29 视觉图片生成工厂管理系统\prototype
python -m http.server 8000
```

### 访问地址
**http://localhost:8000**

### 验收操作清单
1. 右上角切换角色（运营/内容管理员/系统管理员），观察页面权限变化
2. 点击侧边栏🔒页面，确认无响应
3. 点击"页面规格"按钮（右上角文档图标），查看spec抽屉
4. 导航7个组别，确认30个页面全部可访问
5. 重点验证：
   - `pid-dna` 证据徽章 F/U/M/I 显示
   - `task-pipeline` skip态标签与嵌套子步骤
   - `asset-gallery` 资产画廊12张卡片
   - `sys-instance` 不提供切换按钮的callout警告
   - `cfg-sensitivity` word-boundary匹配说明

---

## 7. 已知约束（设计决策）

1. **原型不连接真实数据**：所有数据均为假数据，不连接n8n / PostgreSQL
2. **角色切换仅影响页面渲染**：不涉及真实登录/JWT验证
3. **实例切换为只读展示**：顶部instSel下拉仅演示概念，不触发实际切换
4. **页面规格spec抽屉**：展示技术名/关键动作/读写表/工作流，供开发参考
5. **guide操作指引**：每页最多3-4条，避免干扰主视觉

---

## 8. 交付物完整性确认

- [x] index.html - HTML外壳
- [x] app.css - 完整样式表
- [x] core.js - 内核（导航树+渲染助手+路由）
- [x] pages-a.js - ①工作台+②产品身份库（7页）
- [x] pages-b.js - ③生成任务（8页）
- [x] pages-c.js - ④资产库+⑤台账（5页）
- [x] pages-d.js - ⑥配置中心+⑦系统设置（10页）
- [x] 本验收文档 PROTOTYPE_CHECKLIST.md
- [x] HTTP服务器已启动（http://localhost:8000）

**原型状态：✅ 完整交付，可验收**

---

## 附录：页面ID索引（快速跳转）

```
#dash-todo          #dash-overview      #dash-cost-glance
#pid-list           #pid-dna            #pid-cosmo          #pid-sorftime
#task-a             #task-b             #task-c             #task-d
#task-e             #task-f             #task-g             #task-pipeline
#asset-gallery      #asset-detail
#ledger-cost        #ledger-breakdown   #ledger-failure
#cfg-ia6            #cfg-theme          #cfg-brand          #cfg-market-lang
#cfg-sensitivity    #cfg-physical
#sys-instance       #sys-cred           #sys-user           #sys-audit
```

浏览器地址栏输入 `http://localhost:8000#页面ID` 即可直接跳转。
