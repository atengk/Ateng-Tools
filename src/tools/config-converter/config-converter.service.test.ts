/**
 * Spring 配置与环境变量互转服务单元测试
 *
 * @author Ateng
 * @since 2026-09-29
 */

import { describe, expect, it } from 'vitest';
import {
  convertConfig,
  detectConfigFormat,
  dotKeyToEnvKey,
  envKeyToDotKey,
} from './config-converter.service';

describe('Spring 配置与环境变量互转服务 (config-converter.service)', () => {
  const sampleYaml = `
server:
  port: 8080
spring:
  application:
    name: demo-service
  datasource:
    hikari:
      maximum-pool-size: 20
      connection-timeout: 30000
servers:
  - url: https://api1.example.com
    active: true
  - url: https://api2.example.com
    active: false
`.trim();

  describe('Spring 命名规则转换 (dotKeyToEnvKey & envKeyToDotKey)', () => {
    it('正确将带连字符与点号的 Spring 配置转换为 ENV 命名', () => {
      const envKey = dotKeyToEnvKey('spring.datasource.hikari.maximum-pool-size');
      expect(envKey).toBe('SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE');
    });

    it('正确转换数组索引', () => {
      const envKey = dotKeyToEnvKey('servers[0].url');
      expect(envKey).toBe('SERVERS_0_URL');
    });

    it('正确将 ENV 命名逆向还原为点号与数组索引', () => {
      expect(envKeyToDotKey('SERVERS_0_URL')).toBe('servers[0].url');
      expect(envKeyToDotKey('SPRING_DATASOURCE_URL')).toBe('spring.datasource.url');
    });
  });

  describe('YAML 转换为各目标格式', () => {
    it('YAML 转换为 Properties', () => {
      const result = convertConfig(sampleYaml, 'yaml', 'properties');
      expect(result.success).toBe(true);
      expect(result.output).toContain('server.port=8080');
      expect(result.output).toContain('spring.application.name=demo-service');
      expect(result.output).toContain('spring.datasource.hikari.maximum-pool-size=20');
      expect(result.output).toContain('servers[0].url=https://api1.example.com');
      expect(result.output).toContain('servers[0].active=true');
    });

    it('YAML 转换为 ENV 环境变量', () => {
      const result = convertConfig(sampleYaml, 'yaml', 'env');
      expect(result.success).toBe(true);
      expect(result.output).toContain('SERVER_PORT=8080');
      expect(result.output).toContain('SPRING_APPLICATION_NAME=demo-service');
      expect(result.output).toContain('SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=20');
      expect(result.output).toContain('SERVERS_0_URL=https://api1.example.com');
    });

    it('YAML 转换为 JSON', () => {
      const result = convertConfig(sampleYaml, 'yaml', 'json');
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.output);
      expect(parsed.server.port).toBe(8080);
      expect(parsed.spring.application.name).toBe('demo-service');
      expect(parsed.servers).toHaveLength(2);
    });
  });

  describe('Properties 转换为 YAML 与 ENV', () => {
    const sampleProperties = `
# 基础服务配置
server.port=9090
spring.application.name=user-center
servers[0].name=cluster-a
servers[1].name=cluster-b
`.trim();

    it('Properties 转换为 YAML 树状结构', () => {
      const result = convertConfig(sampleProperties, 'properties', 'yaml');
      expect(result.success).toBe(true);
      expect(result.output).toContain('server:');
      expect(result.output).toContain('port: 9090');
      expect(result.output).toContain('user-center');
      expect(result.output).toContain('cluster-a');
    });

    it('Properties 转换为 ENV 环境变量', () => {
      const result = convertConfig(sampleProperties, 'properties', 'env');
      expect(result.success).toBe(true);
      expect(result.output).toContain('SERVER_PORT=9090');
      expect(result.output).toContain('SPRING_APPLICATION_NAME=user-center');
      expect(result.output).toContain('SERVERS_0_NAME=cluster-a');
      expect(result.output).toContain('SERVERS_1_NAME=cluster-b');
    });
  });

  describe('ENV 环境变量逆向转换', () => {
    const sampleEnv = `
# 生产环境变量
SERVER_PORT=8000
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/db
SERVERS_0_URL=https://node1.com
SERVERS_1_URL=https://node2.com
`.trim();

    it('ENV 转换为 Properties', () => {
      const result = convertConfig(sampleEnv, 'env', 'properties');
      expect(result.success).toBe(true);
      expect(result.output).toContain('server.port=8000');
      expect(result.output).toContain('spring.datasource.url=jdbc:mysql://localhost:3306/db');
      expect(result.output).toContain('servers[0].url=https://node1.com');
    });

    it('ENV 转换为 YAML', () => {
      const result = convertConfig(sampleEnv, 'env', 'yaml');
      expect(result.success).toBe(true);
      expect(result.output).toContain('server:');
      expect(result.output).toContain('port: 8000');
    });
  });

  describe('格式智能推断 (detectConfigFormat)', () => {
    it('准确识别 JSON 格式', () => {
      expect(detectConfigFormat('{"name": "test"}')).toBe('json');
      expect(detectConfigFormat('[\n  {"id": 1}\n]')).toBe('json');
    });

    it('准确识别 ENV 格式', () => {
      const envText = 'SPRING_PROFILES_ACTIVE=prod\nSERVER_PORT=8080';
      expect(detectConfigFormat(envText)).toBe('env');
    });

    it('准确识别 Properties 格式', () => {
      const propText = 'spring.profiles.active=prod\nserver.port=8080';
      expect(detectConfigFormat(propText)).toBe('properties');
    });

    it('准确识别 YAML 格式', () => {
      const yamlText = 'spring:\n  profiles:\n    active: prod';
      expect(detectConfigFormat(yamlText)).toBe('yaml');
    });
  });

  describe('边界与异常防御', () => {
    it('空字符串安全返回空结果', () => {
      const result = convertConfig('', 'yaml', 'properties');
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
      expect(result.entryCount).toBe(0);
    });

    it('语法异常输入友好返回错误信息而非崩溃', () => {
      const invalidJson = '{ bad json: 123, }';
      const result = convertConfig(invalidJson, 'json', 'yaml');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
