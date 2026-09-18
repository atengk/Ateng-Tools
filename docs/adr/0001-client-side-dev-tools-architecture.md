# 0001. 纯客户端开发者工具套件设计与离线执行架构

## 状态
已接受 (Accepted)

## 背景与上下文
在 Ateng-Tools 中需要引入一组日常高频开发者小工具：
1. **雪花 ID 分析器 (Snowflake ID Analyzer)**
2. **cURL 转换器 (cURL Converter)**
3. **JSON 实体类代码生成器 (JSON to Entity Converter)**
4. **SQL DDL 转实体生成器 (SQL DDL to Entity Converter)**

在现代研发协作中，代码、内部接口 cURL 命令、分布式雪花 ID、MySQL 建表 DDL 经常包含敏感的内网域名、敏感参数、主键序列或业务表结构。同时，项目托管于 GitHub Pages 等静态托管环境，无后端服务支持。

## 架构决策
我们决定**100% 采用纯浏览器端 TypeScript 词法与算法解析方案**，完全不依赖任何外部后端 API 或第三方远端转换服务：
1. **绝对离线与零数据泄漏**：所有解析、位运算、AST 遍历与代码生成均在浏览器内存中运行，保证任何输入数据不离开用户本地。
2. **零依赖膨胀原则**：不引入重量级臃肿依赖，充分利用已有生态（如 `change-case`、`date-fns`、`monaco-editor`、Naive UI），自研健壮轻量的词法与 AST 解析器。
3. **分步交付与严格单元测试**：每个工具拆分为独立模块目录（`index.ts`、`.models.ts`、`.service.ts`、`.service.test.ts`、`.vue`），核心转换逻辑 100% 具备 Vitest 单元测试覆盖。
4. **统一归类**：全部归入 `Development` 分类，适配暗黑/明亮主题与响应式分栏布局。

## 后果与影响
- **正面影响**：确保极高的数据安全与合规性；运行速度极快（微秒级响应）；支持离线 PWA 使用。
- **代价与权衡**：需要纯前端实现健壮的 DDL 解析、cURL 词法拆解和 Snowflake 64位 BigInt 位运算，对边缘格式需通过单元测试进行充分兜底。
