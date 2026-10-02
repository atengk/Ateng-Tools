/**
 * JSON Studio 核心业务服务层单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  buildJsonTree,
  calculateBasicMetrics,
  calculateDetailedMetrics,
  collectAllContainerIds,
  collectNodeIdsByDepth,
  determineJsonType,
  escapeJsonString,
  filterJsonTree,
  flattenJson,
  formatBytes,
  formatJson,
  getNodeValueForCopy,
  getSampleJson,
  minifyJson,
  queryJsonPath,
  smartRepairJson,
  transformKeyCase,
  unescapeJsonString,
  unflattenJson,
  validateJson,
} from './json-studio.service';

describe('json-studio.service', () => {
  describe('validateJson', () => {
    it('空字符串与空白字符应视为有效', () => {
      expect(validateJson('').isValid).toBe(true);
      expect(validateJson('   \n  \t  ').isValid).toBe(true);
    });

    it('标准合法 JSON 应返回 isValid 为 true', () => {
      const valid = '{"name": "Ateng", "count": 42, "active": true}';
      const result = validateJson(valid);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('非法语法 JSON 应返回 isValid 为 false 并附带错误信息', () => {
      const invalid = '{ name: "Ateng", }';
      const result = validateJson(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('formatJson', () => {
    it('空字符串应返回空输出且 success 为 true', () => {
      const result = formatJson('');
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('默认使用 2 空格缩进格式化标准 JSON', () => {
      const raw = '{"a":1,"b":[2,3]}';
      const result = formatJson(raw);
      expect(result.success).toBe(true);
      expect(result.output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
    });

    it('支持配置 4 空格缩进格式化', () => {
      const raw = '{"a":1}';
      const result = formatJson(raw, { indent: 4 });
      expect(result.success).toBe(true);
      expect(result.output).toBe('{\n    "a": 1\n}');
    });

    it('支持配置 Tab 制表符缩进格式化', () => {
      const raw = '{"a":1}';
      const result = formatJson(raw, { indent: 'tab' });
      expect(result.success).toBe(true);
      expect(result.output).toBe('{\n\t"a": 1\n}');
    });

    it('支持 JSON5 容错格式化', () => {
      const lenient = "{'hello': 'world',}";
      const result = formatJson(lenient);
      expect(result.success).toBe(true);
      expect(result.output).toBe('{\n  "hello": "world"\n}');
    });

    it('完全不可解析的字符串应返回 success: false 并保留原内容', () => {
      const malformed = 'Not a json {{{';
      const result = formatJson(malformed);
      expect(result.success).toBe(false);
      expect(result.output).toBe(malformed);
      expect(result.error).toBeDefined();
    });
  });

  describe('minifyJson', () => {
    it('空字符串应返回空输出且 success 为 true', () => {
      const result = minifyJson('');
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('多行多空格格式化文本应压缩为紧凑单行', () => {
      const multiLine = '{\n  "hello": [\n    "world",\n    123\n  ]\n}';
      const result = minifyJson(multiLine);
      expect(result.success).toBe(true);
      expect(result.output).toBe('{"hello":["world",123]}');
    });

    it('语法错误内容压缩应返回 success: false', () => {
      const broken = '{ broken: ';
      const result = minifyJson(broken);
      expect(result.success).toBe(false);
      expect(result.output).toBe(broken);
    });
  });

  describe('calculateBasicMetrics', () => {
    it('空字符串应返回全 0 度量', () => {
      const metrics = calculateBasicMetrics('');
      expect(metrics.rawBytes).toBe(0);
      expect(metrics.lineCount).toBe(0);
      expect(metrics.charCount).toBe(0);
      expect(metrics.formattedBytes).toBe(0);
      expect(metrics.minifiedBytes).toBe(0);
    });

    it('有效 JSON 文本应准确计算行数、字符数与编码后字节数', () => {
      const text = '{\n  "key": "测试内容"\n}';
      const metrics = calculateBasicMetrics(text);
      expect(metrics.lineCount).toBe(3);
      expect(metrics.charCount).toBe(text.length);
      expect(metrics.rawBytes).toBeGreaterThan(text.length); // 中文字符 UTF-8 大于字符数
      expect(metrics.formattedBytes).toBeGreaterThan(0);
      expect(metrics.minifiedBytes).toBeGreaterThan(0);
    });
  });

  describe('formatBytes', () => {
    it('边界与非法值应安全返回 0 B', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(NaN)).toBe('0 B');
    });

    it('各阶梯字节量转换正确', () => {
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('getSampleJson', () => {
    it('获取的示例数据应为合法的复杂嵌套 JSON', () => {
      const sample = getSampleJson();
      expect(sample).toContain('ateng-tools-gateway');
      const parsed = JSON.parse(sample);
      expect(parsed.service).toBe('ateng-tools-gateway');
      expect(Array.isArray(parsed.endpoints)).toBe(true);
      expect(parsed.endpoints.length).toBe(2);
    });
  });

  describe('determineJsonType', () => {
    it('正确识别各类型', () => {
      expect(determineJsonType(null)).toBe('null');
      expect(determineJsonType([1, 2])).toBe('array');
      expect(determineJsonType({ a: 1 })).toBe('object');
      expect(determineJsonType(123)).toBe('number');
      expect(determineJsonType(true)).toBe('boolean');
      expect(determineJsonType('hello')).toBe('string');
    });
  });

  describe('buildJsonTree', () => {
    it('正确构建基本类型节点', () => {
      const node = buildJsonTree('测试文本', '$.name', 0, 'name');
      expect(node.type).toBe('string');
      expect(node.value).toBe('测试文本');
      expect(node.displayValue).toBe('"测试文本"');
      expect(node.jsonPath).toBe('$.name');
    });

    it('正确递归构建对象树与绝对 JSONPath 路径', () => {
      const data = {
        user: {
          name: 'Ateng',
          age: 18,
          'special-key': 'value',
        },
        tags: ['vue', 'ts'],
      };
      const tree = buildJsonTree(data);
      expect(tree.type).toBe('object');
      expect(tree.childCount).toBe(2);
      expect(tree.children?.length).toBe(2);

      const userNode = tree.children?.find(c => c.key === 'user');
      expect(userNode).toBeDefined();
      expect(userNode?.jsonPath).toBe('$.user');
      expect(userNode?.children?.length).toBe(3);

      const specialNode = userNode?.children?.find(c => c.key === 'special-key');
      expect(specialNode?.jsonPath).toBe("$.user['special-key']");

      const tagsNode = tree.children?.find(c => c.key === 'tags');
      expect(tagsNode?.type).toBe('array');
      expect(tagsNode?.jsonPath).toBe('$.tags');
      expect(tagsNode?.children?.[0].jsonPath).toBe('$.tags[0]');
    });
  });

  describe('collectAllContainerIds & collectNodeIdsByDepth', () => {
    const data = {
      level1: {
        level2: {
          level3: {
            val: 1,
          },
        },
      },
      arr: [1, 2],
    };
    const tree = buildJsonTree(data);

    it('collectAllContainerIds 应收集所有容器节点 ID', () => {
      const allIds = collectAllContainerIds(tree);
      expect(allIds).toContain('root');
      expect(allIds).toContain('root.level1');
      expect(allIds).toContain('root.level1.level2');
      expect(allIds).toContain('root.level1.level2.level3');
      expect(allIds).toContain('root.arr');
      expect(allIds.length).toBe(5);
    });

    it('collectNodeIdsByDepth 深度 0 应返回空集合', () => {
      expect(collectNodeIdsByDepth(tree, 0)).toEqual([]);
    });

    it('collectNodeIdsByDepth 深度 1 应仅包含根节点', () => {
      expect(collectNodeIdsByDepth(tree, 1)).toEqual(['root']);
    });

    it('collectNodeIdsByDepth 深度 2 应包含深度小于 2 的容器节点', () => {
      const ids = collectNodeIdsByDepth(tree, 2);
      expect(ids).toContain('root');
      expect(ids).toContain('root.level1');
      expect(ids).toContain('root.arr');
      expect(ids).not.toContain('root.level1.level2');
    });
  });

  describe('getNodeValueForCopy', () => {
    it('字符串提取原始文本', () => {
      const node = buildJsonTree('一段纯文本');
      expect(getNodeValueForCopy(node)).toBe('一段纯文本');
    });

    it('基本类型提取数字或布尔文本', () => {
      expect(getNodeValueForCopy(buildJsonTree(12345))).toBe('12345');
      expect(getNodeValueForCopy(buildJsonTree(true))).toBe('true');
      expect(getNodeValueForCopy(buildJsonTree(null))).toBe('null');
    });

    it('复杂对象提取格式化 JSON 字符串', () => {
      const node = buildJsonTree({ a: 1, b: 2 });
      const copyVal = getNodeValueForCopy(node);
      expect(copyVal).toContain('"a": 1');
      expect(copyVal).toContain('\n');
    });
  });

  describe('filterJsonTree', () => {
    const data = {
      user: {
        username: 'ateng_admin',
        nickname: '阿腾',
        age: 25,
      },
      system: {
        enabled: true,
      },
    };
    const tree = buildJsonTree(data);

    it('空搜索词应原样返回树', () => {
      const result = filterJsonTree(tree, '');
      expect(result.filteredNode).toEqual(tree);
      expect(result.matchedCount).toBe(0);
    });

    it('按 key 搜索命中应保留祖先路径并展开', () => {
      const result = filterJsonTree(tree, 'username');
      expect(result.matchedCount).toBe(1);
      expect(result.matchedPaths.has('$.user.username')).toBe(true);
      expect(result.expandedIds.has('root')).toBe(true);
      expect(result.expandedIds.has('root.user')).toBe(true);
    });

    it('按 value 搜索命中对应节点', () => {
      const result = filterJsonTree(tree, '阿腾');
      expect(result.matchedCount).toBe(1);
      expect(result.matchedPaths.has('$.user.nickname')).toBe(true);
    });

    it('无匹配内容应返回 filteredNode 为 null 且匹配数为 0', () => {
      const result = filterJsonTree(tree, '不存在的内容_xyz');
      expect(result.filteredNode).toBeNull();
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('smartRepairJson', () => {
    it('空字符串返回空文本且 hasChanges 为 false', () => {
      const res = smartRepairJson('');
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(false);
      expect(res.repairedText).toBe('');
    });

    it('标准合法 JSON 不产生变更', () => {
      const valid = '{\n  "name": "Ateng"\n}';
      const res = smartRepairJson(valid);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(false);
    });

    it('自动补全缺失引号的属性名', () => {
      const unquoted = '{ name: "Ateng", age: 18 }';
      const res = smartRepairJson(unquoted);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(true);
      const parsed = JSON.parse(res.repairedText);
      expect(parsed.name).toBe('Ateng');
      expect(parsed.age).toBe(18);
    });

    it('纠正单引号包裹的键名与字符串为标准双引号', () => {
      const singleQuote = "{'message': 'hello world'}";
      const res = smartRepairJson(singleQuote);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(true);
      const parsed = JSON.parse(res.repairedText);
      expect(parsed.message).toBe('hello world');
    });

    it('自动清除尾随逗号', () => {
      const trailingComma = '{"items": [1, 2, 3, ], "meta": {"ok": true, }, }';
      const res = smartRepairJson(trailingComma);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(true);
      const parsed = JSON.parse(res.repairedText);
      expect(parsed.items.length).toBe(3);
      expect(parsed.meta.ok).toBe(true);
    });

    it('剥离 JavaScript 单行与多行注释', () => {
      const commented = '{\n  // 这是配置项\n  "port": 8080 /* 行内注释 */\n}';
      const res = smartRepairJson(commented);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(true);
      const parsed = JSON.parse(res.repairedText);
      expect(parsed.port).toBe(8080);
    });

    it('纠偏 Python 关键字字面量 (None/True/False)', () => {
      const pythonJson = '{"active": True, "value": None, "deleted": False}';
      const res = smartRepairJson(pythonJson);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(true);
      const parsed = JSON.parse(res.repairedText);
      expect(parsed.active).toBe(true);
      expect(parsed.value).toBeNull();
      expect(parsed.deleted).toBe(false);
    });

    it('复合非标语法一次性成功修复', () => {
      const dirty = `{
        // 接口响应
        status: 'success',
        code: 200,
        result: None,
        tags: ['a', 'b', ],
      }`;
      const res = smartRepairJson(dirty);
      expect(res.success).toBe(true);
      expect(res.hasChanges).toBe(true);
      expect(res.repairedRules.length).toBeGreaterThan(0);
      const parsed = JSON.parse(res.repairedText);
      expect(parsed.status).toBe('success');
      expect(parsed.code).toBe(200);
      expect(parsed.result).toBeNull();
      expect(parsed.tags).toEqual(['a', 'b']);
    });

    it('无法修复的恶意混乱文本安全返回 success: false', () => {
      const broken = '<<< NOT A JSON >>>';
      const res = smartRepairJson(broken);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('unescapeJsonString & escapeJsonString', () => {
    it('双向对称性测试：转义再反转义保持数据一致', () => {
      const originJson = '{\n  "service": "api",\n  "status": 200\n}';
      const escaped = escapeJsonString(originJson);
      expect(escaped.success).toBe(true);
      expect(escaped.output.startsWith('"')).toBe(true);
      expect(escaped.output.endsWith('"')).toBe(true);

      const unescaped = unescapeJsonString(escaped.output);
      expect(unescaped.success).toBe(true);
      const parsed = JSON.parse(unescaped.output);
      expect(parsed.service).toBe('api');
      expect(parsed.status).toBe(200);
    });

    it('支持反转义带外层双引号的日志转义 JSON 串', () => {
      const logStr = '"{\\"code\\": 200, \\"msg\\": \\"ok\\"}"';
      const res = unescapeJsonString(logStr);
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.output);
      expect(parsed.code).toBe(200);
      expect(parsed.msg).toBe('ok');
    });

    it('支持反转义无外层引号但包含 \\" 的字符串', () => {
      const innerStr = '{\\"code\\": 200, \\"msg\\": \\"ok\\"}';
      const res = unescapeJsonString(innerStr);
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.output);
      expect(parsed.code).toBe(200);
      expect(parsed.msg).toBe('ok');
    });
  });

  describe('queryJsonPath', () => {
    const sampleData = {
      store: {
        name: 'My Book Store',
        book: [
          { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
          { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
          { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 },
          { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99 },
        ],
        bicycle: {
          color: 'red',
          price: 19.95,
        },
      },
    };

    it('根路径 $ 应返回整个源对象', () => {
      const res = queryJsonPath(sampleData, '$');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(1);
      expect(res.results[0]).toEqual(sampleData);
      expect(res.matchedPaths).toEqual(['$']);
    });

    it('基础点号路径应精确提取属性', () => {
      const res = queryJsonPath(sampleData, '$.store.name');
      expect(res.success).toBe(true);
      expect(res.results).toEqual(['My Book Store']);
      expect(res.matchedPaths).toEqual(['$.store.name']);
    });

    it('数组索引 [0] 应提取第一本书', () => {
      const res = queryJsonPath(sampleData, '$.store.book[0].title');
      expect(res.success).toBe(true);
      expect(res.results).toEqual(['Sayings of the Century']);
      expect(res.matchedPaths).toEqual(['$.store.book[0].title']);
    });

    it('负索引 [-1] 应提取最后一本书', () => {
      const res = queryJsonPath(sampleData, '$.store.book[-1].title');
      expect(res.success).toBe(true);
      expect(res.results).toEqual(['The Lord of the Rings']);
      expect(res.matchedPaths).toEqual(['$.store.book[3].title']);
    });

    it('通配符 [*] 应提取所有书籍作者', () => {
      const res = queryJsonPath(sampleData, '$.store.book[*].author');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(4);
      expect(res.results).toContain('Nigel Rees');
      expect(res.results).toContain('J. R. R. Tolkien');
      expect(res.matchedPaths).toContain('$.store.book[0].author');
      expect(res.matchedPaths).toContain('$.store.book[3].author');
    });

    it('切片 [0:2] 应提取前 2 本书', () => {
      const res = queryJsonPath(sampleData, '$.store.book[0:2].title');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(2);
      expect(res.results).toEqual(['Sayings of the Century', 'Sword of Honour']);
      expect(res.matchedPaths).toEqual(['$.store.book[0].title', '$.store.book[1].title']);
    });

    it('深度递归 ..author 应搜索所有子孙中的作者', () => {
      const res = queryJsonPath(sampleData, '$..author');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(4);
      expect(res.results).toEqual([
        'Nigel Rees',
        'Evelyn Waugh',
        'Herman Melville',
        'J. R. R. Tolkien',
      ]);
      expect(res.matchedPaths).toEqual([
        '$.store.book[0].author',
        '$.store.book[1].author',
        '$.store.book[2].author',
        '$.store.book[3].author',
      ]);
    });

    it('深度递归 $..price 应搜索书籍与自行车的全部价格', () => {
      const res = queryJsonPath(sampleData, '$..price');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(5);
      expect(res.results).toEqual([8.95, 12.99, 8.99, 22.99, 19.95]);
    });

    it('属性过滤 [?(@.price < 10)] 应提取价格小于 10 的书籍', () => {
      const res = queryJsonPath(sampleData, '$.store.book[?(@.price < 10)].title');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(2);
      expect(res.results).toEqual(['Sayings of the Century', 'Moby Dick']);
      expect(res.matchedPaths).toEqual(['$.store.book[0].title', '$.store.book[2].title']);
    });

    it('属性过滤 [?(@.category == \'fiction\')] 应按分类过滤', () => {
      const res = queryJsonPath(sampleData, "$.store.book[?(@.category == 'fiction')].author");
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(3);
      expect(res.results).toEqual(['Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien']);
    });

    it('属性存在性测试 [?(@.isbn)] 应提取包含 isbn 的书籍', () => {
      const res = queryJsonPath(sampleData, '$.store.book[?(@.isbn)].title');
      expect(res.success).toBe(true);
      expect(res.results.length).toBe(2);
      expect(res.results).toEqual(['Moby Dick', 'The Lord of the Rings']);
    });

    it('支持以 JSON 字符串形式传入源数据', () => {
      const jsonStr = JSON.stringify(sampleData);
      const res = queryJsonPath(jsonStr, '$.store.bicycle.color');
      expect(res.success).toBe(true);
      expect(res.results).toEqual(['red']);
    });

    it('语法异常表达式应返回语义化错误且不崩溃', () => {
      const res = queryJsonPath(sampleData, '$.store.book[');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.results).toEqual([]);
    });

    it('无匹配结果时应正常返回空结果', () => {
      const res = queryJsonPath(sampleData, '$.store.nonexistent');
      expect(res.success).toBe(true);
      expect(res.results).toEqual([]);
      expect(res.matchedPaths).toEqual([]);
    });

    it('空表达式应安全返回空匹配', () => {
      const res = queryJsonPath(sampleData, '');
      expect(res.success).toBe(true);
      expect(res.results).toEqual([]);
    });
  });

  describe('transformKeyCase', () => {
    const nestedData = {
      user_id: 101,
      user_profile: {
        first_name: 'John',
        last_name: 'Doe',
        home_address: {
          postal_code: '100000',
        },
      },
      tag_list: [
        { tag_id: 1, tag_name: 'developer_tool' },
        { tag_id: 2, tag_name: 'json_studio' },
      ],
    };

    it('应将深层所有键名转换为 camelCase (小驼峰)', () => {
      const res = transformKeyCase(nestedData, 'camelCase');
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.output);
      expect(parsed.userId).toBe(101);
      expect(parsed.userProfile.firstName).toBe('John');
      expect(parsed.userProfile.lastName).toBe('Doe');
      expect(parsed.userProfile.homeAddress.postalCode).toBe('100000');
      expect(parsed.tagList[0].tagId).toBe(1);
      expect(parsed.tagList[0].tagName).toBe('developer_tool'); // 字符串值保持不变
    });

    it('应将深层所有键名转换为 snake_case (下划线)', () => {
      const camelData = {
        userId: 101,
        userProfile: {
          firstName: 'John',
        },
      };
      const res = transformKeyCase(camelData, 'snake_case');
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.output);
      expect(parsed.user_id).toBe(101);
      expect(parsed.user_profile.first_name).toBe('John');
    });

    it('应将深层所有键名转换为 kebab-case (中划线)', () => {
      const camelData = {
        userId: 101,
        userProfile: {
          firstName: 'John',
        },
      };
      const res = transformKeyCase(camelData, 'kebab-case');
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.output);
      expect(parsed['user-id']).toBe(101);
      expect(parsed['user-profile']['first-name']).toBe('John');
    });

    it('应将深层所有键名转换为 pascalCase (大驼峰)', () => {
      const camelData = {
        userId: 101,
        userProfile: {
          firstName: 'John',
        },
      };
      const res = transformKeyCase(camelData, 'pascalCase');
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.output);
      expect(parsed.UserId).toBe(101);
      expect(parsed.UserProfile.FirstName).toBe('John');
    });

    it('非法 JSON 输入应优雅返回错误信息', () => {
      const res = transformKeyCase('{ invalid: json', 'camelCase');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('flattenJson & unflattenJson', () => {
    it('基础嵌套对象扁平化与逆还原保持 100% 对称', () => {
      const original = {
        app: {
          name: 'Ateng-Tools',
          version: '1.0.0',
          config: {
            theme: 'dark',
            debug: true,
          },
        },
      };

      const flatRes = flattenJson(original);
      expect(flatRes.success).toBe(true);
      const flatObj = JSON.parse(flatRes.output);
      expect(flatObj['app.name']).toBe('Ateng-Tools');
      expect(flatObj['app.config.theme']).toBe('dark');
      expect(flatObj['app.config.debug']).toBe(true);

      const unflatRes = unflattenJson(flatObj);
      expect(unflatRes.success).toBe(true);
      const unflatObj = JSON.parse(unflatRes.output);
      expect(unflatObj).toEqual(original);
    });

    it('复杂嵌套与对象数组混合结构扁平化与逆还原对称性', () => {
      const mixed = {
        service: 'payment',
        records: [
          { id: 1, amount: 99.9, currency: 'CNY' },
          { id: 2, amount: 199.5, currency: 'USD' },
        ],
        meta: {
          flags: ['verified', 'fast'],
        },
      };

      const flatRes = flattenJson(mixed);
      expect(flatRes.success).toBe(true);
      const flatObj = JSON.parse(flatRes.output);
      expect(flatObj['records[0].id']).toBe(1);
      expect(flatObj['records[1].currency']).toBe('USD');
      expect(flatObj['meta.flags[0]']).toBe('verified');

      const unflatRes = unflattenJson(flatObj);
      expect(unflatRes.success).toBe(true);
      const restored = JSON.parse(unflatRes.output);
      expect(restored).toEqual(mixed);
    });

    it('空对象与空数组边界处理', () => {
      const edgeData = {
        emptyObj: {},
        emptyArr: [],
        nullVal: null,
      };

      const flatRes = flattenJson(edgeData);
      expect(flatRes.success).toBe(true);
      const flatObj = JSON.parse(flatRes.output);
      expect(flatObj.emptyObj).toEqual({});
      expect(flatObj.emptyArr).toEqual([]);
      expect(flatObj.nullVal).toBeNull();

      const unflatRes = unflattenJson(flatObj);
      expect(unflatRes.success).toBe(true);
      expect(JSON.parse(unflatRes.output)).toEqual(edgeData);
    });

    it('根节点为数组的扁平化与逆还原', () => {
      const rootArray = ['apple', 'banana', 'cherry'];
      const flatRes = flattenJson(rootArray);
      expect(flatRes.success).toBe(true);
      const flatObj = JSON.parse(flatRes.output);
      expect(flatObj['[0]']).toBe('apple');
      expect(flatObj['[1]']).toBe('banana');

      const unflatRes = unflattenJson(flatObj);
      expect(unflatRes.success).toBe(true);
      expect(JSON.parse(unflatRes.output)).toEqual(rootArray);
    });
  });

  describe('calculateDetailedMetrics', () => {
    it('深度度量与类型分布全量统计测试', () => {
      const complexData = {
        name: 'JSON Studio',
        version: 1.0,
        active: true,
        deprecated: null,
        tags: ['tool', 'web', 'client'],
        config: {
          nested: {
            deepKey: 'deepValue',
          },
        },
      };

      const raw = JSON.stringify(complexData, null, 2);
      const metrics = calculateDetailedMetrics(raw);

      expect(metrics.maxDepth).toBe(4); // 根(1) -> config(2) -> nested(3) -> deepKey(4)
      expect(metrics.totalKeys).toBe(8); // 根(6) + config(1) + nested(1) = 8
      expect(metrics.totalArrays).toBe(1); // tags
      expect(metrics.maxArrayLength).toBe(3); // ['tool', 'web', 'client']
      expect(metrics.typeDistribution.stringCount).toBe(5); // 'JSON Studio', 'tool', 'web', 'client', 'deepValue'
      expect(metrics.typeDistribution.numberCount).toBe(1); // 1.0
      expect(metrics.typeDistribution.booleanCount).toBe(1); // true
      expect(metrics.typeDistribution.nullCount).toBe(1); // null
      expect(metrics.typeDistribution.arrayCount).toBe(1); // tags
      expect(metrics.typeDistribution.objectCount).toBe(3); // root, config, nested
      expect(metrics.leafCount).toBe(8); // 5 strings + 1 number + 1 boolean + 1 null
      expect(metrics.compressionRatio).toBeGreaterThan(0);
    });

    it('空字符串输入应安全返回全 0 度量', () => {
      const metrics = calculateDetailedMetrics('');
      expect(metrics.maxDepth).toBe(0);
      expect(metrics.totalKeys).toBe(0);
      expect(metrics.totalArrays).toBe(0);
      expect(metrics.leafCount).toBe(0);
    });

    it('非法语法输入应安全返回基础尺寸度量而无异常抛出', () => {
      const metrics = calculateDetailedMetrics('{ invalid json');
      expect(metrics.maxDepth).toBe(0);
      expect(metrics.lineCount).toBe(1);
      expect(metrics.charCount).toBe(14);
    });
  });
});



