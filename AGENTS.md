# English Reading Video Remotion

## 工作范围

这是独立的英语阅读精讲 Remotion 项目。渲染器必须保持 lesson-agnostic，课程内容来自 `remotion-props.json`，不要把具体课文、题目或答案写进 `src/english-reading/`。

## 工作流

- 课程包放在 `tmp/english-reading/<slug>/`。
- 音频放在 `public/audio/english-reading/<slug>/`。
- 先完成 source 规范化、教学方案 Gate 1 和完整 narration script Gate 2，再生成 TTS、ASR、sync map、Remotion props 和渲染结果。
- 使用 `.agents/skills/produce-english-reading-video-remotion/SKILL.md` 作为完整流程规范。
- 修改 canonical skill 后运行 `npm run sync:claude` 和 `npm run verify:claude`。

## 验证

```bash
npm run check
```

除非用户明确要求，不要导出最终视频。需要渲染时使用显式 props 文件，并用 `ffprobe` 和完整 `ffmpeg` 解码检查结果。
