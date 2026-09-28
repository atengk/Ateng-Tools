# Triage 分类标签映射 (Triage Labels)

工程技能通过五个标准分类角色（Canonical Triage Roles）进行任务生命周期管理。本文档将这些角色映射至本代码库 Issue 跟踪器中实际使用的标签字符串。

| 技能标准角色 (Label in mattpocock/skills) | 本仓库实际标签 (Label in our tracker) | 说明含义 (Meaning)                       |
| ----------------------------------------- | ------------------------------------- | ---------------------------------------- |
| `needs-triage`                            | `needs-triage`                        | 待维护者评估分流此 Issue                  |
| `needs-info`                              | `needs-info`                          | 等待提交者补充更多信息                   |
| `ready-for-agent`                         | `ready-for-agent`                     | 规格已完备，可由 Agent 独立执行          |
| `ready-for-human`                         | `ready-for-human`                     | 需人工介入实现（设计决策、手工测试等）   |
| `wontfix`                                 | `wontfix`                             | 不予处理或关闭                           |

当技能提及某一角色时（例如“添加 AFK-ready 分类标签”），请从上表中查找对应的实际标签字符串。

如果本仓库实际使用不同的标签命名，直接修改上表右侧列（“本仓库实际标签”）即可。
