/**
 * 规范化 Git 提交生成器单元测试套件
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  formatIssuesFooter,
  generateCommitMessage,
} from './conventional-commits-generator.service';

describe('conventional-commits-generator.service', () => {
  describe('formatIssuesFooter', () => {
    it('正确转换逗号或空格分隔的 issue 编号', () => {
      expect(formatIssuesFooter('101, 202')).toBe('Closes #101, #202');
      expect(formatIssuesFooter('#303, #404')).toBe('Closes #303, #404');
      expect(formatIssuesFooter('505')).toBe('Closes #505');
      expect(formatIssuesFooter('')).toBe('');
      expect(formatIssuesFooter('   ')).toBe('');
    });
  });

  describe('generateCommitMessage', () => {
    it('生成最基础的标准提交信息', () => {
      const output = generateCommitMessage({
        type: 'feat',
        subject: '支持用户微信快捷登录',
      });

      expect(output.header).toBe('feat: 支持用户微信快捷登录');
      expect(output.rawMessage).toBe('feat: 支持用户微信快捷登录');
      expect(output.isSubjectWarning).toBe(false);
      expect(output.bashCommand).toContain('git commit -m "feat: 支持用户微信快捷登录"');
    });

    it('支持 Scope 模块范围', () => {
      const output = generateCommitMessage({
        type: 'fix',
        scope: 'payment',
        subject: '修复退款金额精度丢失问题',
      });

      expect(output.header).toBe('fix(payment): 修复退款金额精度丢失问题');
      expect(output.rawMessage).toBe('fix(payment): 修复退款金额精度丢失问题');
    });

    it('正确处理重大破坏性变更 (Breaking Change)', () => {
      const output = generateCommitMessage({
        type: 'refactor',
        scope: 'api',
        isBreaking: true,
        breakingDescription: '弃用旧版 v1 鉴权接口并移除 token 透传',
        subject: '升级鉴权上下文为统一 SecurityContext',
      });

      expect(output.header).toBe('refactor(api)!: 升级鉴权上下文为统一 SecurityContext');
      expect(output.rawMessage).toContain('BREAKING CHANGE: 弃用旧版 v1 鉴权接口并移除 token 透传');
    });

    it('组装完整多块结构（Header + Body + Footers）', () => {
      const output = generateCommitMessage({
        type: 'fix',
        scope: 'auth',
        subject: '修复 Token 过期后未能静默刷新',
        body: '重构 Axios 响应拦截器中的 401 队列重发逻辑，避免并发下多次触发刷新请求。',
        issuesClosed: '88, #99',
      });

      expect(output.rawMessage).toContain('fix(auth): 修复 Token 过期后未能静默刷新\n\n');
      expect(output.rawMessage).toContain('重构 Axios 响应拦截器中的 401 队列重发逻辑');
      expect(output.rawMessage).toContain('Closes #88, #99');
      expect(output.bashCommand).toContain('-m "fix(auth): 修复 Token 过期后未能静默刷新"');
      expect(output.bashCommand).toContain('-m "Closes #88, #99"');
    });

    it('精确度量 Subject 字符数与警告阈值', () => {
      const shortMsg = generateCommitMessage({
        type: 'chore',
        subject: '短提交说明',
      });
      expect(shortMsg.isSubjectWarning).toBe(false);
      expect(shortMsg.isSubjectExcessive).toBe(false);

      const warningMsg = generateCommitMessage({
        type: 'feat',
        subject: 'a'.repeat(55),
      });
      expect(warningMsg.isSubjectWarning).toBe(true);
      expect(warningMsg.isSubjectExcessive).toBe(false);

      const excessiveMsg = generateCommitMessage({
        type: 'feat',
        subject: 'a'.repeat(75),
      });
      expect(excessiveMsg.isSubjectExcessive).toBe(true);
    });

    it('在终端命令中安全转义双引号与特殊符号', () => {
      const output = generateCommitMessage({
        type: 'fix',
        subject: '修复 "JSON" 格式中的 $ 与 ` 符号解析异常',
      });

      expect(output.bashCommand).toContain('\\"JSON\\"');
      expect(output.bashCommand).toContain('\\$');
      expect(output.bashCommand).toContain('\\`');
      expect(output.powerShellCommand).toContain('`"JSON`"');
    });
  });
});
