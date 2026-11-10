# 项目架构

## 数据流

```text
source.md
  -> parse-source-md.mjs
lesson.json
  -> teaching-plan.md / narration-script.md 审核
  -> 分段 TTS + ASR JSON
sync-map.json
  -> build-remotion-props.mjs
remotion-props.json
  -> EnglishReadingLesson
```

## 运行时边界

- `src/english-reading/model/exercise-contract.mjs` 负责题型、答案、证据和展示模式的纯函数校验。
- `src/english-reading/runtime/exercise-timeline.mjs` 负责跨音频段 cue 顺序、题目状态和逐帧状态投影。
- `scripts/validate-english-reading.mjs` 负责 Node 侧的结构预检和可选音频路径检查。
- `scripts/validate-remotion-package.mjs` 在共享契约之外检查本地音频文件、连续时间轴和渲染器所需字段。
- `src/english-reading/` 中的 React 组件只读取 props，不写入具体课程内容。

## 门禁顺序

1. source 校验
2. Gate 1 教学方案确认
3. Gate 2 完整文字稿确认
4. TTS 和 ASR
5. sync map 和 Remotion props 校验
6. 首帧、长文本、题目、答案和证据状态的视觉检查
7. 用户明确要求后再导出 MP4

## 兼容范围

当前渲染器稳定支持 `option-cards`、`left-right-connect` 和 `short-answer`。其他题型或展示模式先在练习契约中显式报错，不自动回退成选择题。
