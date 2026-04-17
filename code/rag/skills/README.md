# Claude Code Skills — 模拟面试官项目

本目录存放项目配套的 Claude Code Skill 文件，其他用户可直接复制到自己的 `.claude/skills/` 目录使用。

## 安装方式

```bash
# 复制单个 skill（以 rag-eval 为例）
mkdir -p ~/.claude/skills/rag-eval
cp rag/code/skills/rag-eval.md ~/.claude/skills/rag-eval/SKILL.md

# 或复制全部
for f in rag/code/skills/*.md; do
  name=$(basename $f .md)
  mkdir -p ~/.claude/skills/$name
  cp $f ~/.claude/skills/$name/SKILL.md
done
```

## Skill 列表

| Skill | 用途 | 调用方式 |
|---|---|---|
| `interview-eval` | 分析面试 JSONL 结果，输出复盘报告 | `/interview-eval [文件名]` |
| `add-qa` | 向题库添加新面试题，自动生成 key_points | `/add-qa 加一道 HyDE hard 题` |
| `rag-eval` | 分析 RAG 实验结果 JSON，解释指标、找异常 | `/rag-eval [结果文件名]` |
| `add-tests` | 给已有代码补充单元测试（逆向补测） | `/add-tests rag/code/11_模拟面试官.py` |
| `fix-dep` | 诊断修复 Python 依赖报错 | `/fix-dep [粘贴报错信息]` |
| `retro` | 复盘近期对话，识别提效机会 | `/retro` |
