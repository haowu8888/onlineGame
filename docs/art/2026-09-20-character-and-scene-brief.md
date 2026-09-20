# 角色与场景美术制作稿

状态：提示词与构图已确定，尚未生成图片。当前会话没有内置图片生成工具；图片 API 需要用户确认并配置 `OPENAI_API_KEY`。

## 统一方向

国风仙侠卡牌插画，半写实面孔与手绘材质，清楚的角色轮廓；避免 Q 版、塑料皮肤和流水线同脸。画面本身不包含名字、数字、卡框或水印，文字与品阶由游戏界面绘制。

界面延续青玉与绢帛底色，角色图使用墨蓝衬景与局部暖金轮廓光。配色：墨蓝 `#1d3545`、青玉 `#80b797`、绢白 `#f8f4e8`、鎏金 `#e3bd72`、朱砂 `#b14d40`。标题沿用楷体，属性与操作使用微软雅黑／苹方；卡面以纵向立绘为主，品阶印章与职业签条放在上角，不遮脸。

角色构图：竖向 2:3，头至大腿，头顶和武器留完整安全边距；眼睛位于上方三分之一，脸、服饰和主要法器在手机小卡面中仍可辨认。角色详情可以展示完整画面，战斗头像裁取头肩。各角色保持独立身份，不用同一立绘换颜色冒充不同角色。

## 共用角色提示词

Use case: stylized-concept.
Asset type: premium Chinese xianxia RPG character card illustration, vertical 2:3.
Primary request: one original character described below, polished semi-realistic painterly fantasy key art.
Composition: head to upper thighs, readable silhouette, clear expressive face near upper third, complete head and visible signature weapon; safe margins for responsive card cropping.
Style: nuanced Chinese facial features, individually designed costume, layered silk, embroidered hems, weathered metal and jade; restrained brush texture, detailed but not noisy.
Lighting: cinematic directional light, warm rim light with cool atmospheric separation; restrained magical effects around the character, never hiding the face.
Backdrop: contextual environment suggested below, softer and lower contrast than the subject.
Constraints: a single character, anatomically coherent hands, no text, no lettering, no numbers, no border, no card UI, no watermark, no logos, no collage, no duplicated faces, no chibi proportions.

## 第一批角色

将共用提示词与对应的 Subject / Backdrop 合并，分别生成；编号严格对应 `js/cardcollect-catalog.js`。

| ID | 角色 | Subject / Backdrop |
| --- | --- | --- |
| 1 | 散修弟子 | A young adult Chinese wandering swordsman, wind-swept black hair tied with a plain cloth ribbon, worn blue-grey robes, simple wooden scabbard and an honest determined expression; misty mountain trail. |
| 4 | 草药师 | An adult Chinese female herbalist with a calm focused face, layered sage-green linen and pale silk, a bamboo medicine basket and a small ceramic remedy jar, delicate medicinal leaves; shaded mountain herb garden. |
| 7 | 灵兽幼崽 | A small original mythical white-and-jade spirit beast with expressive amber eyes, fine luminous fur, a cloud-like tail and tiny antler buds; crouched alert on a mossy stone in a misty forest; fully visible animal anatomy, no human body. |
| 13 | 剑修弟子 | An adult Chinese sword disciple with tied dark hair, indigo outer robes and white inner layers, one slender polished straight sword held naturally across the composition; distant mountain training terrace. |
| 23 | 剑仙 | An adult Chinese sword immortal with a composed sharp gaze, long dark hair lifted by mountain wind, flowing ivory robes with restrained jade embroidery, a long luminous straight sword and a few distant sword silhouettes; cloud sea over a high mountain summit. |
| 24 | 雷法真人 | A mature Chinese thunder Daoist with a distinctive angular face, dark violet and ink-blue ceremonial robes, silver ornaments, one hand directing a controlled arc of blue-violet lightning; approaching storm beyond an ancient mountain shrine. |
| 25 | 太乙真人 | An elderly Chinese Daoist master with a gentle lined face, fine white beard, layered cream and pale jade robes, a jade whisk and a softly glowing healing orb; quiet pine courtyard in warm morning mist. |
| 26 | 金刚尊者 | A powerful adult Chinese guardian monk with a shaved head, a calm unyielding expression, weathered bronze-gold arm guards, dark ochre cloth and stone prayer beads; a protective golden halo behind the shoulders, ancient stone temple steps. |
| 27 | 天狐仙子 | An adult Chinese fox spirit woman with silver-white hair, subtle fox ears, intelligent amber eyes, dignified flowing blush-and-ivory hanfu with modest coverage and jade hair ornaments; soft white fox tails frame her silhouette, moonlit flowering garden. |
| 28 | 药王 | An elderly Chinese master physician with a different broader face than the Daoist master, a short silver beard, olive and ochre layered robes, a carved herb box and one glowing medicinal sprig; terraced medicinal gardens at dawn. |
| 29 | 剑尊 | An adult Chinese supreme sword master with a stern noble face, dark hair, black silk and restrained antique-gold armor, one monumental elegant straight sword, sharp luminous sword energy; broken cloud formations above a remote peak. |
| 30 | 仙帝 | An adult Chinese celestial emperor with a dignified serene face, long dark hair, an intricate but restrained jade-and-gold crown, ivory and deep teal ceremonial robes, a circular celestial jade seal suspended above an open palm; distant cloud palace and layered mountain horizon. |

## 第一批场景

Use case: stylized-concept.
Asset type: premium Chinese xianxia game environment illustration, landscape 16:9.
Style: the same painterly semi-realistic world as the character cards, believable stone, timber and silk materials, strong foreground/midground/background depth, restrained atmospheric perspective.
Constraints: no people, no text, no labels, no numbers, no border, no interface, no watermark; readable composition at both desktop and mobile crops, visual detail concentrated around the edges when the center hosts gameplay.

1. **云海仙庭**：A mountain-top Chinese cultivation pavilion surrounded by a sea of clouds, weathered white stone terrace, ancient pine trees, subtle jade ornaments, a distant layered mountain silhouette, warm dawn light meeting cool blue mist. Broad calm space across the central terrace for game characters.
2. **竹影演武场**：A circular stone martial arts arena in a secluded bamboo courtyard, carefully laid worn stone slabs, moss in the joints, a few fallen red maple leaves, distant traditional tiled roofs, diagonal late-afternoon light. Oblique top-down composition with a clear unobstructed central fighting area.
3. **星河仙录**：A tranquil celestial archive opening onto an expansive moonlit cloud sea, carved dark timber pillars, pale hanging silk, floating dust illuminated by soft gold lanterns, an open stone platform in the foreground. Deep indigo and muted jade with small warm light accents; clear central area behind the roster interface.

## 接入与验收

- 原始大图与提示词保留，页面使用压缩 WebP；角色缩略图和详情图分尺寸导出，避免卡牌列表下载全尺寸原稿。
- 同一角色在阵容、候选名册、召唤、图鉴、详情及战斗头像中使用同一身份图像。
- 只引用已经生成并检查过的文件；不提交空图片、不把 SVG 或程序天幕称为 AI 生成的立绘。
- 图片加载失败须能在浏览器控制台中直接发现，不用假成功或静默替图。
- 更新 Service Worker 版本，明确加入动态拼接的图片路径；验证手机裁切、离线加载、累计下载体积与角色身份对应关系。
