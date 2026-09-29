/**
 * Spring 配置与环境变量互转器领域数据模型
 *
 * @author Ateng
 * @since 2026-09-29
 */

export type ConfigFormat = 'yaml' | 'properties' | 'env' | 'json';

export interface ConfigConverterOptions {
  /**
   * 是否启用 Spring Boot 宽松绑定（Relaxed Binding）
   * 开启时：点号转下划线、连字符转下划线、大写转义、数组 servers[0] 转 SERVERS_0
   */
  relaxedBinding: boolean
  /**
   * 是否将导出的键按字典序排序
   */
  sortKeys: boolean
  /**
   * YAML 和 JSON 序列化缩进空格数
   */
  indent: number
}

export interface ConfigConversionResult {
  /**
   * 转换是否成功
   */
  success: boolean
  /**
   * 转换后的文本结果
   */
  output: string
  /**
   * 转换失败时的错误信息
   */
  error?: string
  /**
   * 转换成功的扁平配置条目总数
   */
  entryCount: number
}

export const DEFAULT_CONFIG_CONVERTER_OPTIONS: ConfigConverterOptions = {
  relaxedBinding: true,
  sortKeys: true,
  indent: 2,
};

export interface ConfigSample {
  key: string
  label: string
  format: ConfigFormat
  suggestedTarget: ConfigFormat
  description: string
  content: string
}

export const CONFIG_SAMPLES: ConfigSample[] = [
  {
    key: 'spring-boot-yaml',
    label: 'Spring Boot 全量微服务配置 (YAML)',
    format: 'yaml',
    suggestedTarget: 'env',
    description: '包含服务端口、多数据源 Hikari、Redis 与节点列表',
    content: `# Spring Boot 核心服务配置 (YAML)
server:
  port: 8080
spring:
  application:
    name: user-center
  profiles:
    active: prod
  datasource:
    url: jdbc:mysql://localhost:3306/user_center?useSSL=false
    username: root
    password: "\${DB_PASSWORD:secret}"
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
  redis:
    host: 127.0.0.1
    port: 6379
    timeout: 3000
servers:
  - name: node-1
    url: https://node1.example.com
  - name: node-2
    url: https://node2.example.com`,
  },
  {
    key: 'container-k8s-env',
    label: '容器与 K8s 环境变量集合 (ENV)',
    format: 'env',
    suggestedTarget: 'yaml',
    description: '大写下划线环境变量，测试逆向还原为 YAML / Properties',
    content: `# 生产容器与 K8s 环境变量 (ENV)
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:mysql://mysql-cluster:3306/order_db?useSSL=false
SPRING_DATASOURCE_USERNAME=app_user
SPRING_DATASOURCE_PASSWORD=StrongP@ssw0rd!
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=30
SPRING_REDIS_HOST=redis-sentinel
SPRING_REDIS_PORT=6379
SERVERS_0_NAME=primary-cluster
SERVERS_0_URL=https://api-a.prod.internal
SERVERS_1_NAME=backup-cluster
SERVERS_1_URL=https://api-b.prod.internal`,
  },
  {
    key: 'legacy-properties',
    label: '经典 Java 属性文件 (Properties)',
    format: 'properties',
    suggestedTarget: 'env',
    description: '点号扁平属性，包含 Feign、JPA 与日志级别',
    content: `# 传统 Java 应用配置 (Properties)
server.port=9090
server.servlet.context-path=/api/v1
spring.application.name=payment-gateway
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.url=jdbc:mysql://db.internal:3306/pay_db
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
feign.client.config.default.connect-timeout=5000
feign.client.config.default.read-timeout=10000
logging.level.root=INFO
logging.level.com.ateng=DEBUG`,
  },
  {
    key: 'gateway-routes-yaml',
    label: 'Spring Cloud Gateway 路由规则 (复杂数组)',
    format: 'yaml',
    suggestedTarget: 'env',
    description: '演示微服务网关多层嵌套对象与断言数组展开',
    content: `# Spring Cloud Gateway 路由与过滤器配置 (YAML)
spring:
  cloud:
    gateway:
      routes:
        - id: order-service-route
          uri: lb://order-service
          predicates:
            - Path=/api/order/**
          filters:
            - StripPrefix=1
            - AddRequestHeader=X-Tenant-Id,tenant_001
        - id: payment-service-route
          uri: lb://payment-service
          predicates:
            - Path=/api/pay/**
          filters:
            - StripPrefix=1`,
  },
];
