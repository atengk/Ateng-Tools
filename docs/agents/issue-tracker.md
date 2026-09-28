# 任务跟踪器：GitHub (Issue tracker: GitHub)

本代码库的所有任务（Issues）与技术规格书（Specs）均维护于 GitHub Issues 中。所有操作统一使用 `gh` CLI 命令行工具执行。

## 操作规范 (Conventions)

- **创建 Issue**：`gh issue create --title "..." --body "..."`。多行内容建议使用 HereDoc 语法。
- **查看 Issue**：`gh issue view <number> --comments`，可通过 `jq` 过滤评论并同时获取标签。
- **列出 Issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，可附加相应的 `--label` 和 `--state` 过滤参数。
- **添加评论**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭 Issue**：`gh issue close <number> --comment "..."`

仓库地址通过 `git remote -v` 自动推导 —— 在 Git 检出目录中运行 `gh` 会自动完成该推导。

## Pull Requests 作为分类分流对象 (Pull requests as a triage surface)

**PRs as a request surface: no.** _（如果本代码库将外部 PR 视为功能需求，请设为 `yes`；`/triage` 技能会读取此配置项。）_

当配置为 `yes` 时，PR 将经历与 Issue 相同的标签与状态流转，使用对应的 `gh pr` 命令：

- **查看 PR**：`gh pr view <number> --comments`，并通过 `gh pr diff <number>` 查看代码差异。
- **列出待分流的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，仅保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的记录（剔除 `OWNER` / `MEMBER` / `COLLABORATOR`）。
- **评论 / 打标 / 关闭**：对应使用 `gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

由于 GitHub 的 Issue 与 PR 共享编号空间，单独的 `#42` 可能指代任一类型 —— 优先通过 `gh pr view 42` 解析，若不存在则回退至 `gh issue view 42`。

## 当技能提示“发布到任务跟踪器 (publish to the issue tracker)”时

直接创建一个 GitHub Issue。

## 当技能提示“获取对应工单 (fetch the relevant ticket)”时

执行 `gh issue view <number> --comments` 获取详情与评论。

## 探路操作机制 (Wayfinding operations)

供 `/wayfinder` 技能使用。**路线图 (Map)** 为单个汇总 Issue，而具体的**子任务卡片 (child ticket)** 作为工单挂载。

- **路线图 (Map)**：打上 `wayfinder:map` 标签的单个 Issue，正文维护“备忘 (Notes) / 既往决策 (Decisions-so-far) / 迷雾待办 (Fog)”等内容。创建命令：`gh issue create --label wayfinder:map`。
- **子任务卡片 (Child ticket)**：作为 GitHub 子 Issue（通过 sub-issues API 端点的 `gh api` 关联）链接至路线图。如果当前仓库未启用子 Issue 功能，则在路线图正文的任务清单（Task List）中追加该子任务，并在子任务正文顶部注明 `Part of #<map>`。标签格式为 `wayfinder:<type>`（类型包括 `research` / `prototype` / `grilling` / `task`）。任务一旦认领，自动指派给推进开发者。
- **前置依赖阻塞 (Blocking)**：采用 GitHub 的**原生 Issue 依赖关联 (native issue dependencies)** —— 作为 UI 可见的规范表示。通过 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 建立阻塞边，其中 `<blocker-db-id>` 为阻塞方的数值型**数据库 ID**（通过 `gh api repos/<owner>/<repo>/issues/<n> --jq .id` 获取，**注意不是** `#number` 或 `node_id`）。GitHub 会返回 `issue_dependencies_summary.blocked_by`（仅统计打开状态的阻塞项 —— 作为动态门禁）。当依赖 API 不可用时，回退到在子任务正文顶部标注 `Blocked by: #<n>, #<n>`。当所有阻塞方 Issue 均关闭时，该任务解除阻塞。
- **前沿就绪查询 (Frontier query)**：列出路线图中所有打开状态的子任务（`gh issue list --state open`，作用域限制在路线图的子任务/任务清单），剔除存在未解阻塞项的工单（`issue_dependencies_summary.blocked_by > 0` 或 `Blocked by` 中仍有 open 状态项）以及已被认领指派的工单；按路线图排序优先选择首个就绪工单。
- **认领任务 (Claim)**：`gh issue edit <n> --add-assignee @me` —— 作为当前会话的首次写操作。
- **解决任务 (Resolve)**：通过 `gh issue comment <n> --body "<answer>"` 提交结论，随后执行 `gh issue close <n>` 关闭工单，最后将上下文指针（简述 + 链接）追加至路线图 Issue 正文的“既往决策 (Decisions-so-far)”中。
