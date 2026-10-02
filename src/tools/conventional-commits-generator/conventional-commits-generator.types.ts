/**
 * 规范化 Git 提交生成器核心类型定义与契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

export interface CommitTypeDefinition {
  type: CommitType;
  emoji: string;
  title: string;
  description: string;
  releaseSemver: 'major' | 'minor' | 'patch' | 'none';
}

export interface CommitMessageSpec {
  /** 提交类型 */
  type: CommitType;

  /** 影响范围/模块 (Scope) */
  scope?: string;

  /** 是否为重大破坏性变更 (Breaking Change) */
  isBreaking?: boolean;

  /** 重大破坏性变更详细描述 */
  breakingDescription?: string;

  /** 简短摘要 (Subject) */
  subject: string;

  /** 详细正文 (Body) */
  body?: string;

  /** 关联/关闭的 Issue 或任务编号，如 "123, 456" 或 "#123" */
  issuesClosed?: string;

  /** 额外尾注说明 (Footer) */
  footer?: string;
}

export interface GeneratedCommitOutput {
  /** 完整的 Git 提交信息（多行） */
  rawMessage: string;

  /** 提交信息的首行头部（Header） */
  header: string;

  /** 摘要字符数 */
  subjectLength: number;

  /** 摘要是否超过建议字符上限（> 50 为警告，> 72 为不推荐） */
  isSubjectWarning: boolean;
  isSubjectExcessive: boolean;

  /** 适用于 Bash / Zsh 的完整 Git 提交命令 */
  bashCommand: string;

  /** 适用于 Windows PowerShell 的完整 Git 提交命令 */
  powerShellCommand: string;
}
