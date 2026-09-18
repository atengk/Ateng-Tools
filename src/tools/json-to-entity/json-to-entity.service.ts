import { camelCase, pascalCase } from 'change-case';
import type {
  ClassDefinition,
  FieldDefinition,
  JsonToEntityOptions,
} from './json-to-entity.models';

/**
 * 将 JSON 字符串解析并递归推断为实体类结构模型
 * @param jsonStr 原始 JSON 字符串
 * @param options 配置项
 * @returns ClassDefinition 树形结构
 */
export function parseJsonToClass(
  jsonStr: string,
  options: JsonToEntityOptions,
): ClassDefinition {
  // 1. 解析 JSON 数据
  const parsed = JSON.parse(jsonStr.trim());

  // 2. 若输入是顶层数组，以第一个元素作为对象模型推断
  let targetObj: Record<string, any> = {};
  if (Array.isArray(parsed)) {
    targetObj = parsed.length > 0 && typeof parsed[0] === 'object' ? parsed[0] : { value: parsed };
  } else if (typeof parsed === 'object' && parsed !== null) {
    targetObj = parsed;
  } else {
    targetObj = { value: parsed };
  }

  // 3. 递归分析对象属性与嵌套类
  return analyzeObject(targetObj, options.rootClassName || 'RootDTO', options);
}

/**
 * 递归分析对象属性与类型推断
 */
function analyzeObject(
  obj: Record<string, any>,
  className: string,
  options: JsonToEntityOptions,
): ClassDefinition {
  const fields: FieldDefinition[] = [];
  const nestedClasses: ClassDefinition[] = [];

  for (const rawKey of Object.keys(obj)) {
    const val = obj[rawKey];
    const fieldName = options.autoCamelCase ? camelCase(rawKey) : rawKey;
    let javaType = 'Object';
    let tsType = 'any';
    let isDateTime = false;
    let childClassName: string | undefined;

    if (val === null || val === undefined) {
      javaType = 'Object';
      tsType = 'any';
    } else if (typeof val === 'boolean') {
      javaType = 'Boolean';
      tsType = 'boolean';
    } else if (typeof val === 'string') {
      // 日期时间推断
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        javaType = 'LocalDate';
        tsType = 'string';
        isDateTime = true;
      } else if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(val)) {
        javaType = 'LocalDateTime';
        tsType = 'string';
        isDateTime = true;
      } else {
        javaType = 'String';
        tsType = 'string';
      }
    } else if (typeof val === 'number') {
      if (!Number.isInteger(val)) {
        javaType = 'Double';
        tsType = 'number';
      } else if (
        val > 2147483647 ||
        val < -2147483648 ||
        rawKey.toLowerCase().endsWith('id') ||
        rawKey.toLowerCase().endsWith('time') ||
        rawKey.toLowerCase().endsWith('timestamp')
      ) {
        javaType = 'Long';
        tsType = 'number';
      } else {
        javaType = 'Integer';
        tsType = 'number';
      }
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        javaType = 'List<Object>';
        tsType = 'any[]';
      } else if (typeof val[0] !== 'object' || val[0] === null) {
        const itemType = typeof val[0] === 'number' ? 'Long' : typeof val[0] === 'boolean' ? 'Boolean' : 'String';
        const itemTs = typeof val[0] === 'number' ? 'number' : typeof val[0] === 'boolean' ? 'boolean' : 'string';
        javaType = `List<${itemType}>`;
        tsType = `${itemTs}[]`;
      } else {
        // 数组包含对象：推断子类
        childClassName = pascalCase(rawKey);
        const childClass = analyzeObject(val[0], childClassName, options);
        nestedClasses.push(childClass);
        javaType = `List<${childClassName}>`;
        tsType = `${childClassName}[]`;
      }
    } else if (typeof val === 'object') {
      // 嵌套对象：推断子类
      childClassName = pascalCase(rawKey);
      const childClass = analyzeObject(val, childClassName, options);
      nestedClasses.push(childClass);
      javaType = childClassName;
      tsType = childClassName;
    }

    fields.push({
      rawName: rawKey,
      fieldName,
      javaType,
      tsType,
      isDateTime,
      childClassName,
    });
  }

  return {
    className,
    fields,
    nestedClasses,
  };
}

/**
 * 将类模型生成为标准的 Java 实体类代码 (Lombok + Jackson)
 */
export function generateJavaFromClass(
  rootClass: ClassDefinition,
  options: JsonToEntityOptions,
): string {
  const lines: string[] = [];

  // 1. 包名声明
  if (options.packageName) {
    lines.push(`package ${options.packageName};`, '');
  }

  // 2. 收集所需 Import
  const imports = new Set<string>();
  imports.add('import java.io.Serializable;');

  function collectImports(c: ClassDefinition) {
    for (const f of c.fields) {
      if (f.javaType.startsWith('List<')) {
        imports.add('import java.util.List;');
      }
      if (f.javaType === 'LocalDateTime') {
        imports.add('import java.time.LocalDateTime;');
      }
      if (f.javaType === 'LocalDate') {
        imports.add('import java.time.LocalDate;');
      }
    }
    for (const nc of c.nestedClasses) {
      collectImports(nc);
    }
  }
  collectImports(rootClass);

  if (options.useLombok) {
    imports.add('import lombok.Data;');
    imports.add('import lombok.Builder;');
    imports.add('import lombok.NoArgsConstructor;');
    imports.add('import lombok.AllArgsConstructor;');
  }

  if (options.useJackson) {
    imports.add('import com.fasterxml.jackson.annotation.JsonProperty;');
  }

  lines.push(...Array.from(imports).sort(), '');

  // 3. 递归生成 Java 类代码
  function renderClass(c: ClassDefinition, isInner: boolean, indentLevel: number) {
    const indent = '    '.repeat(indentLevel);
    const innerIndent = '    '.repeat(indentLevel + 1);

    lines.push(`${indent}/**`);
    lines.push(`${indent} * ${c.className}`);
    lines.push(`${indent} * @author Ateng`);
    lines.push(`${indent} */`);

    if (options.useLombok) {
      lines.push(`${indent}@Data`);
      lines.push(`${indent}@Builder`);
      lines.push(`${indent}@NoArgsConstructor`);
      lines.push(`${indent}@AllArgsConstructor`);
    }

    const classModifier = isInner ? 'public static class' : 'public class';
    lines.push(`${indent}${classModifier} ${c.className} implements Serializable {`);
    lines.push(`${innerIndent}private static final long serialVersionUID = 1L;`, '');

    // 字段声明
    for (const f of c.fields) {
      lines.push(`${innerIndent}/** ${f.rawName} */`);
      if (options.useJackson) {
        lines.push(`${innerIndent}@JsonProperty("${f.rawName}")`);
      }
      lines.push(`${innerIndent}private ${f.javaType} ${f.fieldName};`, '');
    }

    // 内部类递归
    if (options.innerClassMode && c.nestedClasses.length > 0) {
      for (const nested of c.nestedClasses) {
        renderClass(nested, true, indentLevel + 1);
        lines.push('');
      }
    }

    lines.push(`${indent}}`);
  }

  renderClass(rootClass, false, 0);

  // 4. 若不启用内部类，则在最下方依次追加独立类定义
  if (!options.innerClassMode && rootClass.nestedClasses.length > 0) {
    for (const nested of rootClass.nestedClasses) {
      lines.push('');
      renderClass(nested, false, 0);
    }
  }

  return lines.join('\n');
}

/**
 * 将类模型生成为 TypeScript Interface 声明
 */
export function generateTsFromClass(rootClass: ClassDefinition): string {
  const lines: string[] = [];

  function renderInterface(c: ClassDefinition) {
    lines.push(`export interface ${c.className} {`);
    for (const f of c.fields) {
      lines.push(`  ${f.fieldName}?: ${f.tsType};`);
    }
    lines.push('}', '');

    for (const nested of c.nestedClasses) {
      renderInterface(nested);
    }
  }

  renderInterface(rootClass);
  return lines.join('\n').trim();
}

/**
 * 统一转换入口
 */
export function generateCodeFromJson(
  jsonStr: string,
  options: JsonToEntityOptions,
): string {
  if (!jsonStr.trim()) {
    return '';
  }

  try {
    const classDef = parseJsonToClass(jsonStr, options);
    if (options.targetLanguage === 'typescript') {
      return generateTsFromClass(classDef);
    }
    return generateJavaFromClass(classDef, options);
  } catch (err: any) {
    return `// 代码生成异常: ${err?.message || '无法解析的 JSON 字符串'}`;
  }
}
