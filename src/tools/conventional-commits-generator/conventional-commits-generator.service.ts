/**
 * 规范化 Git 提交生成器纯函数服务
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  CommitMessageSpec,
  CommitTypeDefinition,
  GeneratedCommitOutput,
} from './conventional-commits-generator.types';

/**
 * Conventional Commits 1.0.0 标准提交类型列表
 */
export const COMMIT_TYPES: CommitTypeDefinition[] = [
  {
    type: 'feat',
    emoji: '✨',
    title: '新增特性',
    description: '引入用户可见或业务层面的新功能、新接口',
    releaseSemver: 'minor',
  },
  {
    type: 'fix',
    emoji: '🐛',
    title: '修复缺陷',
    description: '修复生产或测试环境中的 Bug、异常报错',
    releaseSemver: 'patch',
  },
  {
    type: 'docs',
    emoji: '📝',
    title: '文档更新',
    description: '仅修改或新增文档、注释、说明文件 (README/Wiki)',
    releaseSemver: 'none',
  },
  {
    type: 'style',
    emoji: '💄',
    title: '代码格式',
    description: '不影响代码逻辑的格式变动 (空格、分号、排版对其)',
    releaseSemver: 'none',
  },
  {
    type: 'refactor',
    emoji: '♻️',
    title: '代码重构',
    description: '既不修复缺陷也不添加功能的代码结构重组优化',
    releaseSemver: 'none',
  },
  {
    type: 'perf',
    emoji: '⚡',
    title: '性能优化',
    description: '提升运行效率、降低内存占用或缩减包体积的代码改动',
    releaseSemver: 'patch',
  },
  {
    type: 'test',
    emoji: '🧪',
    title: '测试用例',
    description: '新增或重构单元测试、集成测试，不触碰生产代码',
    releaseSemver: 'none',
  },
  {
    type: 'build',
    emoji: '📦',
    title: '构建依赖',
    description: '影响构建系统、打包配置或外部 npm/maven 依赖项的变更',
    releaseSemver: 'patch',
  },
  {
    type: 'ci',
    emoji: '👷',
    title: '持续集成',
    description: '修改 GitHub Actions、GitLab CI、Dockerfile 等流程脚本',
    releaseSemver: 'none',
  },
  {
    type: 'chore',
    emoji: '🔧',
    title: '日常杂项',
    description: '工具配置、辅助脚本、依赖更新等杂项日常维护',
    releaseSemver: 'none',
  },
  {
    type: 'revert',
    emoji: '⏪',
    title: '版本回退',
    description: '撤销先前的某次或某些 Commit 提交',
    releaseSemver: 'patch',
  },
];

/**
 * 格式化关联的 Issue 列表为标准 Footer
 *
 * @param issuesInput 用户输入的 issue 列表（如 "123, #456"）
 * @returns 标准化 Footer 文本（如 "Closes #123, #456"）
 */
export function formatIssuesFooter(issuesInput?: string): string {
  if (!issuesInput || !issuesInput.trim()) {
    return '';
  }

  const items = issuesInput
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('#') ? s : `#${s}`));

  if (items.length === 0) {
    return '';
  }

  return `Closes ${items.join(', ')}`;
}

/**
 * 转义字符串以安全嵌入终端命令行单双引号参数
 */
function escapeForShell(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}

function escapeForPowerShell(str: string): string {
  return str.replace(/`/g, '``').replace(/"/g, '`"');
}

/**
 * 组装并生成符合 Conventional Commits 规范的提交输出
 *
 * @param spec 提交要素定义模型
 * @returns 完整生成结果
 */
export function generateCommitMessage(spec: CommitMessageSpec): GeneratedCommitOutput {
  const type = spec.type || 'feat';
  const cleanScope = (spec.scope || '').trim();
  const cleanSubject = (spec.subject || '').trim();

  // 1. 组装 Header: <type>(<scope>)<breaking>: <subject>
  let header = type;
  if (cleanScope) {
    header += `(${cleanScope})`;
  }
  if (spec.isBreaking) {
    header += '!';
  }
  header += cleanSubject ? `: ${cleanSubject}` : ': ';

  // 2. 组装 Body
  const cleanBody = (spec.body || '').trim();

  // 3. 组装 Footer 块（破坏性变更 + 关联 Issue + 自定义 Footer）
  const footerLines: string[] = [];
  if (spec.isBreaking) {
    const breakingDesc = (spec.breakingDescription || '').trim() || cleanSubject;
    footerLines.push(`BREAKING CHANGE: ${breakingDesc}`);
  }

  const issuesFooter = formatIssuesFooter(spec.issuesClosed);
  if (issuesFooter) {
    footerLines.push(issuesFooter);
  }

  const cleanCustomFooter = (spec.footer || '').trim();
  if (cleanCustomFooter) {
    footerLines.push(cleanCustomFooter);
  }

  // 4. 组装完整多行文本 (Header + 空行 + Body + 空行 + Footers)
  const messageBlocks: string[] = [header];
  if (cleanBody) {
    messageBlocks.push(cleanBody);
  }
  if (footerLines.length > 0) {
    messageBlocks.push(footerLines.join('\n'));
  }

  const rawMessage = messageBlocks.join('\n\n');

  // 5. 字符数度量
  const subjectLength = cleanSubject.length;
  const isSubjectWarning = subjectLength > 50;
  const isSubjectExcessive = subjectLength > 72;

  // 6. 跨平台终端命令组装
  const bashArgs = messageBlocks.map((b) => `-m "${escapeForShell(b)}"`).join(' ');
  const bashCommand = `git commit ${bashArgs}`;

  const psArgs = messageBlocks.map((b) => `-m "${escapeForPowerShell(b)}"`).join(' ');
  const powerShellCommand = `git commit ${psArgs}`;

  return {
    rawMessage,
    header,
    subjectLength,
    isSubjectWarning,
    isSubjectExcessive,
    bashCommand,
    powerShellCommand,
  };
}
