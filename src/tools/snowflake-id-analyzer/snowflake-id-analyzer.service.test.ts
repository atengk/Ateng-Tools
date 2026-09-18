import { describe, expect, it } from 'vitest';
import {
  generateSnowflakeId,
  parseBatchSnowflakeIds,
  parseSnowflakeId,
} from './snowflake-id-analyzer.service';

describe('Snowflake ID Analyzer Service', () => {
  const TWITTER_EPOCH = 1288834974657;

  it('1. should accurately parse a standard 5+5+12 Twitter snowflake ID', () => {
    // 构造测试数据: relativeTimestamp = 1000ms, datacenter = 1, worker = 2, sequence = 3
    const id = (1000n << 22n) | (1n << 17n) | (2n << 12n) | 3n; // 4194443267n
    const result = parseSnowflakeId(id.toString(), {
      epoch: TWITTER_EPOCH,
      mode: 'standard',
    });

    expect(result.rawId).toBe('4194443267');
    expect(result.relativeTimestamp).toBe(1000);
    expect(result.absoluteTimestamp).toBe(TWITTER_EPOCH + 1000);
    expect(result.datacenterId).toBe(1);
    expect(result.workerId).toBe(2);
    expect(result.sequence).toBe(3);
    expect(result.signBit).toBe('0');
    expect(result.binary.length).toBe(64);
  });

  it('2. should accurately parse in workerOnly (10+12) mode', () => {
    // 构造测试数据: relativeTimestamp = 2000ms, worker = 513 (10位), sequence = 99
    const id = (2000n << 22n) | (513n << 12n) | 99n;
    const result = parseSnowflakeId(id.toString(), {
      epoch: TWITTER_EPOCH,
      mode: 'workerOnly',
    });

    expect(result.relativeTimestamp).toBe(2000);
    expect(result.datacenterId).toBeNull();
    expect(result.workerId).toBe(513);
    expect(result.sequence).toBe(99);
  });

  it('3. should support custom epoch timestamp', () => {
    const customEpoch = 1700000000000; // 2023-11-14
    const id = (5000n << 22n) | (3n << 17n) | (4n << 12n) | 1n;
    const result = parseSnowflakeId(id.toString(), {
      epoch: customEpoch,
      mode: 'standard',
    });

    expect(result.epoch).toBe(customEpoch);
    expect(result.absoluteTimestamp).toBe(customEpoch + 5000);
    expect(result.datacenterId).toBe(3);
    expect(result.workerId).toBe(4);
    expect(result.sequence).toBe(1);
  });

  it('4. should handle multiline batch parsing with valid and invalid rows', () => {
    const id1 = ((1000n << 22n) | (1n << 17n) | (1n << 12n) | 1n).toString();
    const id2 = ((2000n << 22n) | (2n << 17n) | (2n << 12n) | 2n).toString();
    const input = `${id1}\n  \nnot-a-number\n${id2}`;

    const batch = parseBatchSnowflakeIds(input, {
      epoch: TWITTER_EPOCH,
      mode: 'standard',
    });

    expect(batch.length).toBe(3);
    expect(batch[0].isValid).toBe(true);
    expect(batch[0].rawId).toBe(id1);
    expect(batch[1].isValid).toBe(false);
    expect(batch[1].errorMessage).toBeDefined();
    expect(batch[2].isValid).toBe(true);
    expect(batch[2].rawId).toBe(id2);
  });

  it('5. should synthesize and reverse-parse generated Snowflake IDs', () => {
    const generatedId = generateSnowflakeId(
      {
        absoluteTimestamp: TWITTER_EPOCH + 88888,
        datacenterId: 15,
        workerId: 25,
        sequence: 1234,
      },
      {
        epoch: TWITTER_EPOCH,
        mode: 'standard',
      },
    );

    const parsed = parseSnowflakeId(generatedId, {
      epoch: TWITTER_EPOCH,
      mode: 'standard',
    });

    expect(parsed.relativeTimestamp).toBe(88888);
    expect(parsed.datacenterId).toBe(15);
    expect(parsed.workerId).toBe(25);
    expect(parsed.sequence).toBe(1234);
  });

  it('6. should reject invalid inputs like negative numbers or non-numeric strings', () => {
    expect(() =>
      parseSnowflakeId('abc', { epoch: TWITTER_EPOCH, mode: 'standard' }),
    ).toThrow();
    expect(() =>
      parseSnowflakeId('-123', { epoch: TWITTER_EPOCH, mode: 'standard' }),
    ).toThrow();
  });
});
