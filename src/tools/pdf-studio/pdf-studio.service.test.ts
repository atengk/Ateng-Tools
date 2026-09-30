/**
 * PDF Studio 纯函数服务单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  createVirtualDeck,
  createVirtualDeckForDoc,
  exportPdfFromDeck,
  normalizeAngle,
  parsePageRange,
  recoverAllDeletedPages,
  rotateAllPages,
  rotatePage,
  toggleDeletePage,
} from './pdf-studio.service';
import type { SourceDocumentItem } from './pdf-studio.types';

/**
 * 辅助构造具有多页内容的样本 PDF 字节
 */
async function createMockPdf(pageCount: number, title = '样本文档'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([300, 200]);
    page.drawText(`Page ${i + 1}`);
  }
  doc.setTitle(title);
  return doc.save();
}

describe('pdf-studio.service', () => {
  describe('normalizeAngle', () => {
    it('正确将各正负角度规范化至 0/90/180/270', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(90)).toBe(90);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-180)).toBe(180);
      expect(normalizeAngle(-360)).toBe(0);
    });
  });

  describe('parsePageRange 页面范围表达式解析', () => {
    it('正确解析离散单页表达式', () => {
      expect(parsePageRange('1, 3, 5', 10)).toEqual([1, 3, 5]);
      expect(parsePageRange('4', 5)).toEqual([4]);
    });

    it('正确解析连续区间表达式 (例如 1-3, 5, 8-10)', () => {
      expect(parsePageRange('1-3, 5, 8-10', 12)).toEqual([1, 2, 3, 5, 8, 9, 10]);
    });

    it('支持反向区间、波浪线、中文逗号与分号混合输入', () => {
      expect(parsePageRange('5-3，1～2；7~8', 10)).toEqual([1, 2, 3, 4, 5, 7, 8]);
    });

    it('自动去重并按升序排列', () => {
      expect(parsePageRange('5, 3-6, 1, 2, 4', 10)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('严格过滤超出页码上限与小于等于0的非法值', () => {
      expect(parsePageRange('0, -2, 3, 8-15, abc', 10)).toEqual([3, 8, 9, 10]);
    });

    it('面对空输入或非法格式返回空数组', () => {
      expect(parsePageRange('', 10)).toEqual([]);
      expect(parsePageRange('   ', 10)).toEqual([]);
      expect(parsePageRange('invalid-tokens', 10)).toEqual([]);
      expect(parsePageRange('1-3', 0)).toEqual([]);
    });
  });

  describe('Virtual Page Deck 甲板基础状态操作', () => {
    const sourceDocs: SourceDocumentItem[] = [
      {
        id: 'doc_1',
        name: '合同.pdf',
        size: 1024,
        bytes: new Uint8Array([]),
        pageCount: 3,
      },
    ];

    it('createVirtualDeck 与 createVirtualDeckForDoc 能够正确初始化页面列表并关联来源名', () => {
      const deck = createVirtualDeck(sourceDocs);
      expect(deck.length).toBe(3);
      expect(deck[0].id).toBe('page_doc_1_0');
      expect(deck[0].sourceDocName).toBe('合同.pdf');
      expect(deck[0].originalPageIndex).toBe(0);
      expect(deck[0].rotation).toBe(0);
      expect(deck[0].isDeleted).toBe(false);

      const singleDocPages = createVirtualDeckForDoc(sourceDocs[0]);
      expect(singleDocPages.length).toBe(3);
      expect(singleDocPages[1].sourceDocName).toBe('合同.pdf');
    });

    it('rotatePage 单独旋转目标页面', () => {
      const deck = createVirtualDeck(sourceDocs);
      const rotated = rotatePage(deck, 'page_doc_1_1', 90);

      expect(rotated[0].rotation).toBe(0);
      expect(rotated[1].rotation).toBe(90);
      expect(rotated[2].rotation).toBe(0);

      // 逆时针再转 90° 回到 0
      const back = rotatePage(rotated, 'page_doc_1_1', -90);
      expect(back[1].rotation).toBe(0);
    });

    it('rotateAllPages 批量旋转有效页面', () => {
      let deck = createVirtualDeck(sourceDocs);
      deck = toggleDeletePage(deck, 'page_doc_1_2'); // 删除第 3 页

      const rotated = rotateAllPages(deck, 90);
      expect(rotated[0].rotation).toBe(90);
      expect(rotated[1].rotation).toBe(90);
      expect(rotated[2].rotation).toBe(0); // 被删除页面保持原样
    });

    it('toggleDeletePage 与 recoverAllDeletedPages 正确切换与全部恢复', () => {
      let deck = createVirtualDeck(sourceDocs);
      deck = toggleDeletePage(deck, 'page_doc_1_0');
      expect(deck[0].isDeleted).toBe(true);

      deck = toggleDeletePage(deck, 'page_doc_1_0');
      expect(deck[0].isDeleted).toBe(false);

      // 全部恢复测试
      deck = toggleDeletePage(deck, 'page_doc_1_0');
      deck = toggleDeletePage(deck, 'page_doc_1_1');
      expect(deck.filter(p => p.isDeleted).length).toBe(2);

      const recovered = recoverAllDeletedPages(deck);
      expect(recovered.every(p => !p.isDeleted)).toBe(true);
    });
  });

  describe('exportPdfFromDeck 导出编译与增强特性', () => {
    it('当所有页面均被删除时抛出拦截异常', async () => {
      const mockBytes = await createMockPdf(2);
      const docs: SourceDocumentItem[] = [
        {
          id: 'doc_test',
          name: 'test.pdf',
          size: mockBytes.length,
          bytes: mockBytes,
          pageCount: 2,
        },
      ];
      let deck = createVirtualDeck(docs);
      deck = deck.map(p => ({ ...p, isDeleted: true }));

      await expect(exportPdfFromDeck(deck, docs)).rejects.toThrow('有效页面数量为 0');
    });

    it('正确应用删减、重排与旋转角度并生成完整 PDF', async () => {
      const mockBytes = await createMockPdf(3, '原始文档');
      const docs: SourceDocumentItem[] = [
        {
          id: 'doc_a',
          name: '原始文档.pdf',
          size: mockBytes.length,
          bytes: mockBytes,
          pageCount: 3,
        },
      ];

      let deck = createVirtualDeck(docs);
      // 1. 删除第 2 页 (index 1)
      deck = toggleDeletePage(deck, 'page_doc_a_1');
      // 2. 旋转第 1 页 90°
      deck = rotatePage(deck, 'page_doc_a_0', 90);
      // 3. 将原第 3 页调至最前
      deck = [deck[2], deck[0], deck[1]];

      const result = await exportPdfFromDeck(deck, docs, {
        customFileName: '工坊编排成果',
      });

      expect(result.pageCount).toBe(2); // 3 删 1 剩 2
      expect(result.fileName).toBe('工坊编排成果.pdf');
      expect(result.bytes.length).toBeGreaterThan(0);

      // 验证生成的 PDF 实体的页数与旋转角
      const loaded = await PDFDocument.load(result.bytes);
      expect(loaded.getPageCount()).toBe(2);
      // 第 1 页对应原第 3 页 (无旋转)
      expect(loaded.getPage(0).getRotation().angle).toBe(0);
      // 第 2 页对应原第 1 页 (旋转 90°)
      expect(loaded.getPage(1).getRotation().angle).toBe(90);
    });

    it('多文档追加合并导出：跨多个文档自由编排合并为一个 PDF', async () => {
      const bytesDoc1 = await createMockPdf(2, '文档1');
      const bytesDoc2 = await createMockPdf(3, '文档2');

      const docs: SourceDocumentItem[] = [
        {
          id: 'doc_1',
          name: '文档1.pdf',
          size: bytesDoc1.length,
          bytes: bytesDoc1,
          pageCount: 2,
        },
        {
          id: 'doc_2',
          name: '文档2.pdf',
          size: bytesDoc2.length,
          bytes: bytesDoc2,
          pageCount: 3,
        },
      ];

      // 初始合并 2 + 3 = 5 页
      const deck = createVirtualDeck(docs);
      expect(deck.length).toBe(5);

      // 交错重排：文档2的第1页, 文档1的第1页, 文档2的第2页
      const reorderedDeck = [deck[2], deck[0], deck[3]];
      const result = await exportPdfFromDeck(reorderedDeck, docs, {
        customFileName: '多文档合并成果',
      });

      expect(result.pageCount).toBe(3);
      expect(result.fileName).toBe('多文档合并成果.pdf');

      const loaded = await PDFDocument.load(result.bytes);
      expect(loaded.getPageCount()).toBe(3);
    });

    it('支持传递水印配置选项并平稳导出', async () => {
      const mockBytes = await createMockPdf(2, '测试水印');
      const docs: SourceDocumentItem[] = [
        {
          id: 'doc_w',
          name: '测试水印.pdf',
          size: mockBytes.length,
          bytes: mockBytes,
          pageCount: 2,
        },
      ];
      const deck = createVirtualDeck(docs);

      const result = await exportPdfFromDeck(deck, docs, {
        customFileName: '带水印导出',
        watermark: {
          type: 'text',
          text: '内部保密 · 绝密文件 🈲',
          fontSize: 32,
          color: '#ff0000',
          opacity: 0.3,
          rotation: -45,
          layout: 'tile',
        },
      });

      expect(result.pageCount).toBe(2);
      expect(result.fileName).toBe('带水印导出.pdf');
      expect(result.bytes.length).toBeGreaterThan(0);
    });
  });
});

