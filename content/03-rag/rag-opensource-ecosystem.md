---
title: RAG 开源生态指南
description: RAG 管线中的开源工具、引擎和平台分层对比：PaddleOCR → MinerU → RAGFlow，含选型逻辑和架构定位。
---

# RAG 开源生态指南

> 本文梳理 RAG 管线中常见的开源项目，按**工具层→引擎层→平台层**三层架构组织，帮助理解各项目的定位、能力边界和组合关系。
>
> 可视化对比图：[MinerU vs PaddleOCR vs RAGFlow 交互图](/viz/rag/mineru-paddleocr-ragflow.html)

---

## 三层架构总览

RAG 系统的开源生态可以按职责分为三层：

| 层级 | 职责 | 代表项目 | 类比 |
|------|------|----------|------|
| **工具层** | 单一能力（OCR / 文档解析 / 表格提取） | PaddleOCR, python-docx, mammoth | 螺丝刀 |
| **引擎层** | 端到端文档解析（PDF/DOCX → 结构化数据） | MinerU, Deepdoc | 发动机 |
| **平台层** | 完整 RAG 系统（文档 → 检索 → 回答） | RAGFlow, Dify, FastGPT | 整辆车 |

> 下层被上层集成：PaddleOCR 被 MinerU 内置，Deepdoc 被 RAGFlow 内置。理解层级关系是选型的前提。

---

## 工具层：单一能力组件

### PaddleOCR

- **定位**：图片/扫描件 → 文字识别的 OCR 引擎
- **核心能力**：文字检测（DB++）+ 文字识别（SVTR）+ 版面分析 + 表格识别 + 公式识别
- **输出**：识别文字 + 坐标 + 置信度（无结构化，无关系建模）
- **框架**：PaddlePaddle（百度）
- **OmniDocBench**：92.86（第 1）
- **安装**：`pip install paddleocr`，原生支持 Windows/macOS
- **适用场景**：只需要从图片中提取文字，不需要文档结构理解
- **GitHub**：~25k stars

### python-docx

- **定位**：DOCX 文件的 XML 遍历工具
- **核心能力**：段落/表格/图片提取，保持文档原始结构
- **特点**：轻量、无外部依赖，RAGFlow 和 MinerU 都用它作为 DOCX 处理的底层

### mammoth

- **定位**：DOCX → HTML 转换器
- **核心能力**：将 DOCX 转为语义化 HTML，保留标题层级和列表结构
- **特点**：MinerU 用它做全文档预解析，特别是表格处理

---

## 引擎层：文档解析框架

### MinerU

- **定位**：PDF/DOCX → 结构化数据的端到端文档解析框架（应用层）
- **核心能力**：
  - 版面检测（mAP 97.5）
  - 内置 PaddleOCR 作为 OCR 引擎
  - 元素分类（text/table/image）
  - 关系建模（caption 关联）
- **输出**：Markdown + `content_list.json`（类型 + 页码 + bbox + caption）
- **框架**：PyTorch
- **OmniDocBench**：90.67（第 3）
- **局限**：
  - 依赖链复杂（torch + sglang）
  - Windows 2.0+ 受限（sgl-kernel 无 wheel）
  - macOS Intel 不可用
- **GitHub**：~25k stars
- **一句话**：PaddleOCR 是螺丝刀，MinerU 是工具箱（端到端文档解析，内含 PaddleOCR 这把螺丝刀）

### Deepdoc（RAGFlow 内置）

- **定位**：RAGFlow 自研的文档解析引擎
- **核心能力**：基于 python-docx 的文本+表格+图片提取（~400 行代码）
- **特点**：简洁够用，与 RAGFlow 的分块和检索模块紧密集成

---

## 平台层：端到端 RAG 系统

### RAGFlow

- **定位**：端到端 RAG 平台（从文档到回答的全链路）
- **核心能力**：
  - 文档解析（python-docx / Deepdoc）
  - 智能分块（模板 + 可视化编辑 + TOC 提取）
  - 向量化 + 混合检索（Dense + BM25）
  - 精排 Reranker
  - LLM 生成回答（多模型支持 + Agentic RAG）
  - 多模态输出（ContentBlock 数组：文本+图片+表格）
  - API + 聊天界面
- **图片处理**：发给 Vision LLM（GPT-4V/Qwen-VL）做描述
- **部署**：Docker Compose（ES + Redis + MinIO + MySQL），运维成本较高
- **GitHub**：~30k stars
- **适用场景**：需要开箱即用的完整 RAG 系统，上传文档即可问答

---

## MinerU vs RAGFlow：定位对比

| 维度 | MinerU（文档解析引擎） | RAGFlow（端到端 RAG 平台） |
|------|----------------------|--------------------------|
| **定位** | Pipeline 的第一步 | 完整 RAG 系统 |
| **覆盖范围** | 文档 → 结构化数据 | 文档 → 分块 → 检索 → 精排 → 生成 → 输出 |
| **类比** | 发动机 | 整辆车 |
| **DOCX 解析** | python-docx + mammoth（~2700 行），表格最强 | python-docx（~400 行），简洁够用 |
| **图片处理** | 提取 blob，不做 OCR | 发给 Vision LLM 做描述 |
| **分块** | 不负责 | 模板分块 + 可视化编辑 |
| **检索** | 不负责 | Dense + BM25 + Reranker |
| **LLM 集成** | 无 | 多模型 + Agentic RAG |
| **部署** | pip / Docker | Docker Compose（含 ES/Redis/MinIO） |

---

## 选型决策指南

### 什么时候选 PaddleOCR

- 只需要从图片/扫描件中提取文字
- 需要轻量部署，pip 一行安装
- Windows/macOS 原生支持是硬需求

### 什么时候选 MinerU

- 需要从 PDF 中提取结构化信息（表格位置、图文关联）
- 输入以 PDF 为主，需要高精度版面分析
- 愿意承担 PyTorch 依赖链的复杂度

### 什么时候选 RAGFlow

- 需要开箱即用的完整 RAG 系统
- 不想自建检索/精排/生成链路
- 有 Docker 运维能力，接受较重的部署方案

### 什么时候自建

- 需要深度定制（意图识别、查询改写、置信度评估等）
- 部署环境受限，不能跑完整 Docker Compose
- 学习目标：手搓 RAG 全链路本身就是目标

---

## 借鉴参考

以下是从开源项目中可以借鉴的具体实现模式：

| 借鉴内容 | 来源 | 说明 |
|----------|------|------|
| body 遍历保序（图文位置保持） | RAGFlow `docx_parser.py` | 遍历 DOCX body 子元素保持原始顺序 |
| `pic:pic` XPath 图片提取 | RAGFlow | 从段落中精确提取嵌入图片 |
| ContentBlock 数组输出协议 | RAGFlow 多模态输出 | 文本+图片+表格的统一输出格式 |
| mammoth 全文档预解析表格 | MinerU | 先用 mammoth 转 HTML 再提取表格 |
| TOC 锚点预收集 | MinerU | 构建文档目录树辅助分块 |

---

## 更新记录

- **2026-04-20**：首次创建，基于 MinerU/PaddleOCR/RAGFlow 三框架对比
