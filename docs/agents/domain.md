# 领域文档规范 (Domain Docs)

说明工程技能在探索和修改本代码库时，如何规范阅读与遵循领域业务文档。

## 在探索代码库之前，必须先阅读以下文件

- 根目录下的 **`CONTEXT.md`**；或者
- 根目录下的 **`CONTEXT-MAP.md`**（如果存在）—— 它指向每个业务上下文的 `CONTEXT.md`。请阅读与当前任务相关的所有上下文文档。
- **`docs/adr/`** —— 研读与即将开展工作相关的架构决策记录（ADR）。在多上下文仓库中，还需检查对应上下文目录下的 `src/<context>/docs/adr/` 决策记录。

如果上述任何文件不存在，请**保持静默并直接继续**。不要提示文件缺失，也不要主动提议预先创建它们。`/domain-modeling` 技能（可通过 `/grill-with-docs` 和 `/improve-codebase-architecture` 触发）会在术语或决策实际明确时按需延迟创建。

## 目录结构规范 (File structure)

单上下文代码库 (Single-context，绝大多数项目适用)：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-client-side-dev-tools-architecture.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文代码库 (Multi-context，根目录下存在 `CONTEXT-MAP.md`)：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统全局架构决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 限界上下文私有决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 严格遵循统一术语表词汇 (Use the glossary's vocabulary)

当在输出中指代领域概念时（包括 Issue 标题、重构方案、方案假设、测试用例名称），必须使用 `CONTEXT.md` 中严格定义的术语，严禁使用词汇表中已明确标明避免（_Avoid_）的同义词。

如果所需的领域概念尚未收录在术语表中，这是一个明确信号 —— 要么是你创造了项目未曾使用的自造词（需重新评估），要么存在真实的业务术语缺口（应记录并在后续通过 `/domain-modeling` 补全）。

## 显式标注 ADR 决策冲突 (Flag ADR conflicts)

如果提出的方案或输出与既有 ADR 存在冲突，必须显式指明，绝不能静默覆盖：

> _与 ADR-0001 (纯客户端开发者工具套件设计与离线执行架构) 存在冲突 —— 但值得重新探讨，因为……_
