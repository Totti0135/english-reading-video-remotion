# English Reading Video Remotion

独立的英语阅读精讲视频生产项目。输入一份规范化的 `source.md`，经过教学设计和完整文字稿审核，再生成分段音频、ASR 时间轴、Remotion props，并渲染为可复现的视频。

## 项目结构

- `src/english-reading/` 通用 Remotion 场景和视觉组件
- `scripts/` 源文档解析、lesson 校验、ASR 同步和 props 构建脚本
- `assets/` source、教学方案、文字稿和 Remotion props 模板
- `docs/architecture.md` 当前数据流、运行时边界和门禁顺序
- `.agents/skills/produce-english-reading-video-remotion/` 完整工作流 skill
- `tmp/english-reading/<slug>/` 每个课程的源文档、lesson、ASR、同步图和 props
- `public/audio/english-reading/<slug>/` 每个 narration segment 的本地音频
- `public/fonts/english-reading/` 固定字体资源

## 快速开始

```bash
npm install
npm run check
npm run dev
```

示例课程 `all-about-bushfires` 已包含 source、已审核的 teaching plan 和 narration script、lesson、sync map、Remotion props 及音频，可以直接在 Studio 中打开 `EnglishReadingLesson` 预览。

需要快速做视觉冒烟检查时运行 `npm run render:sample:still`，完整导出使用 `npm run render:sample`。

## 生成新课程

1. 复制 `assets/source.template.md` 到 `tmp/english-reading/<slug>/source.md`，填入完整文章、词汇、语言提示和题目。
2. 运行 `npm run parse:source -- tmp/english-reading/<slug>/source.md --out tmp/english-reading/<slug>/lesson.json`。
3. 按 `.agents/skills/produce-english-reading-video-remotion/SKILL.md` 完成教学方案审核和完整 narration script 审核。
4. 生成每个 narration segment 的本地音频和 ASR JSON。
5. 运行 `npm run build:sync-map -- tmp/english-reading/<slug>/lesson.json --asr-dir tmp/english-reading/<slug>/asr --out tmp/english-reading/<slug>/sync-map.json`。
6. 运行 `npm run build:props -- tmp/english-reading/<slug>/lesson.json --sync tmp/english-reading/<slug>/sync-map.json --audio-dir public/audio/english-reading/<slug> --out tmp/english-reading/<slug>/remotion-props.json`。
7. 校验通过后使用 `npx remotion render src/index.ts EnglishReadingLesson out/english-reading/<slug>.mp4 --props=tmp/english-reading/<slug>/remotion-props.json` 渲染。

## 校验层级

- `npm run typecheck` 检查 Remotion 和场景代码。
- `npm test` 检查练习契约、跨音频 cue 时间轴、音频路径安全和 TypeScript 公共声明。
- `npm run validate:sample` 同时检查课程 source/draft/timed、Remotion props、练习语义和示例音频文件。
- `node scripts/validate-english-reading.mjs <file.json> --kind lesson --source` 适合尚未填写答案的 source 草稿。
- `node scripts/validate-english-reading.mjs <file.json> --kind package --public-dir public` 检查 props 结构和本地音频路径。

## Skill 同步

`.agents/skills/produce-english-reading-video-remotion/` 是 canonical copy。需要给 Claude Code 使用时运行 `npm run sync:claude`，再用 `npm run verify:claude` 检查 snapshot。
