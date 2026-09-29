import http from 'node:http';
import crypto from 'node:crypto';

/**
 * 零外部依赖极简本地 WebSocket Echo 服务 (RFC 6455)
 *
 * @author Ateng
 * @since 2026-09-29
 */
const PORT = 8088;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`WebSocket Echo Server running on ws://127.0.0.1:${PORT}`);
});

function createFrame(opcode, payloadBuffer) {
  const len = payloadBuffer.length;
  let header;
  if (len <= 125) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payloadBuffer]);
}

function sendFrame(socket, text) {
  const buf = Buffer.from(text, 'utf-8');
  socket.write(createFrame(0x1, buf));
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
  ];

  const protocol = req.headers['sec-websocket-protocol'];
  if (protocol) {
    const firstProto = protocol.split(',')[0].trim();
    headers.push(`Sec-WebSocket-Protocol: ${firstProto}`);
  }

  socket.write(headers.concat('\r\n').join('\r\n'));

  // 发送欢迎帧
  sendFrame(
    socket,
    JSON.stringify({
      event: 'welcome',
      message: '欢迎连接本地 WebSocket Echo 测试服务！',
      url: req.url,
      time: new Date().toISOString(),
    }),
  );

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const byte1 = buffer[0];
      const byte2 = buffer[1];
      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) !== 0;
      let payloadLen = byte2 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) break;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) break;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskKeyLen = isMasked ? 4 : 0;
      if (buffer.length < offset + maskKeyLen + payloadLen) {
        break;
      }

      let payload = buffer.subarray(offset + maskKeyLen, offset + maskKeyLen + payloadLen);
      if (isMasked) {
        const maskKey = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = payload[i] ^ maskKey[i % 4];
        }
        payload = unmasked;
      }

      buffer = buffer.subarray(offset + maskKeyLen + payloadLen);

      if (opcode === 0x8) {
        // 关闭帧
        const closeBuf = Buffer.from([0x88, 0x00]);
        socket.write(closeBuf);
        socket.end();
        return;
      } else if (opcode === 0x9) {
        // Ping 帧 -> 回复 Pong
        const pong = createFrame(0x0a, payload);
        socket.write(pong);
      } else if (opcode === 0x1) {
        // 文本帧 -> 原样 Echo 回显
        const text = payload.toString('utf-8');
        sendFrame(socket, text);
      }
    }
  });

  socket.on('error', () => {
    socket.destroy();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[WebSocket Echo Server] Running at ws://127.0.0.1:${PORT}`);
});
