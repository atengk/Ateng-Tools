<script setup lang="ts">
/**
 * P2P 局域网快传组件视图层
 *
 * @author Ateng
 * @since 2026-10-01
 */

import Peer, { type DataConnection } from 'peerjs';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import {
  Archive,
  Camera,
  Check,
  Clipboard,
  Copy,
  DeviceDesktop,
  DeviceMobile,
  DeviceTablet,
  Devices,
  Download,
  Eye,
  File,
  Files,
  Notes,
  Photo,
  PlayerPlay,
  Qrcode,
  Refresh,
  Scan,
  Send,
  Settings,
  ShieldCheck,
  Trash,
  Unlink,
  Upload,
  Wifi,
  X,
} from '@vicons/tabler';
import { useQRCode } from '../qr-code-generator/useQRCode';
import { useCopy } from '@/composable/copy';
import { Base64 } from 'js-base64';
import {
  BUFFER_HIGH_WATER_MARK,
  BUFFER_LOW_WATER_MARK,
  DEFAULT_CHUNK_SIZE,
  assembleFileBlob,
  buildRoomShareUrl,
  calculateChunkCount,
  compressSdp,
  createBatchZip,
  createFileAckMessage,
  createFileChunkMessage,
  createFileMetaMessage,
  createProtocolMessage,
  createTextMessage,
  decompressSdp,
  detectCurrentDeviceInfo,
  formatFileSize,
  formatLatency,
  formatTransferSpeed,
  generateRoomId,
  isPreviewableImage,
  isPreviewableText,
  parseFileAckPayload,
  parseFileChunkPayload,
  parseFileMetaPayload,
  parseProtocolMessage,
  parseTextMessagePayload,
} from './p2p-file-transfer.service';
import type {
  AirGapStep,
  ConnectionMode,
  ConnectionRequestApproval,
  ConnectionStatus,
  CustomPeerConfig,
  FileAckPayload,
  FileChunkPayload,
  FileMetaPayload,
  PeerDeviceInfo,
  ProtocolMessage,
  ReceivedFileItem,
  TextNoteItem,
  TransferTask,
} from './p2p-file-transfer.types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

// 基础响应式状态
const status = ref<ConnectionStatus>('idle');
const role = ref<'host' | 'client'>('host');
const myPeerId = ref('');
const targetRoomId = ref('');
const roomShareUrl = ref('');
const remoteDevice = ref<PeerDeviceInfo | null>(null);
const latency = ref<number>(-1);
const autoTrust = ref<boolean>(false);
const showApprovalModal = ref<boolean>(false);
const pendingApproval = ref<ConnectionRequestApproval | null>(null);
const showSignalingModal = ref<boolean>(false);

// 文本便签状态
const textInput = ref('');
const notesList = ref<TextNoteItem[]>([]);

// 文件传输状态
const activeTab = ref<'files' | 'notes'>('files');
const autoDownload = ref<boolean>(false);
const transferQueue = ref<TransferTask[]>([]);
const receivedFiles = ref<ReceivedFileItem[]>([]);
const receivingBuffers = new Map<
  string,
  { meta: FileMetaPayload; chunks: (ArrayBuffer | Uint8Array)[]; receivedBytes: number }
>();
const fileInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref<boolean>(false);
const showPreviewModal = ref<boolean>(false);
const previewItem = ref<ReceivedFileItem | null>(null);
const previewTextContent = ref<string>('');
const isPreviewLoading = ref<boolean>(false);
const isZipping = ref<boolean>(false);


// 自定义信令服务配置
const customSignaling = ref<CustomPeerConfig>({
  enabled: false,
  host: '',
  port: 9000,
  path: '/',
  secure: true,
});

// 离线气隙模式状态
const connectionMode = ref<ConnectionMode>('relay');
const airgapRole = ref<'host' | 'client'>('host');
const airgapStep = ref<AirGapStep>('idle');
const airgapOfferText = ref<string>('');
const airgapAnswerText = ref<string>('');
const airgapInputOffer = ref<string>('');
const airgapInputAnswer = ref<string>('');
const isAirgapGenerating = ref<boolean>(false);
const showCameraModal = ref<boolean>(false);
const cameraVideoRef = ref<HTMLVideoElement | null>(null);
let cameraStream: MediaStream | null = null;
let cameraScanFrame: number | null = null;
let airgapPc: RTCPeerConnection | null = null;
let airgapDc: RTCDataChannel | null = null;

// 二维码生成
const { qrcode } = useQRCode({
  text: roomShareUrl,
  color: { background: '#ffffff', foreground: '#000000' },
  options: { width: 220, margin: 1 },
});

const { qrcode: airgapOfferQr } = useQRCode({
  text: airgapOfferText,
  color: { background: '#ffffff', foreground: '#000000' },
  options: { width: 220, margin: 1 },
});

const { qrcode: airgapAnswerQr } = useQRCode({
  text: airgapAnswerText,
  color: { background: '#ffffff', foreground: '#000000' },
  options: { width: 220, margin: 1 },
});

// PeerJS 实例与数据通道引用
let peerInstance: Peer | null = null;
let activeConn: DataConnection | null = null;
let pendingConn: DataConnection | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// 计算对端设备图标
const remoteDeviceIcon = computed(() => {
  if (!remoteDevice.value) return Devices;
  if (remoteDevice.value.deviceType === 'mobile') return DeviceMobile;
  if (remoteDevice.value.deviceType === 'tablet') return DeviceTablet;
  return DeviceDesktop;
});

// 计算当前状态标签类型
const statusTagType = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'success';
    case 'connecting':
      return 'info';
    case 'disconnected':
    case 'error':
      return 'error';
    default:
      return 'default';
  }
});

/**
 * 拷贝房间直达链接
 */
async function handleCopyLink() {
  if (!roomShareUrl.value) return;
  await copy(roomShareUrl.value);
  message.success(t('tools.p2p-file-transfer.copied'));
}

/**
 * 拷贝房间代码
 */
async function handleCopyRoomCode() {
  if (!myPeerId.value) return;
  await copy(myPeerId.value);
  message.success(t('tools.p2p-file-transfer.copied'));
}

/**
 * 统一发送协议数据帧
 */
function sendProtocolData(data: unknown) {
  if (connectionMode.value === 'airgap') {
    if (airgapDc && airgapDc.readyState === 'open') {
      if (typeof data === 'string' || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        airgapDc.send(data as any);
      } else {
        airgapDc.send(JSON.stringify(data));
      }
    }
  } else {
    if (activeConn && activeConn.open) {
      activeConn.send(data);
    }
  }
}

/**
 * 判断当前直连通道是否就绪
 */
function isChannelReady(): boolean {
  if (connectionMode.value === 'airgap') {
    return airgapDc !== null && airgapDc.readyState === 'open';
  }
  return activeConn !== null && activeConn.open;
}

/**
 * 获取当前底层数据通道缓冲区未发送字节数
 */
function getChannelBufferedAmount(): number {
  if (connectionMode.value === 'airgap') {
    return airgapDc?.bufferedAmount || 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (activeConn as any)?.dataChannel?.bufferedAmount || 0;
}

/**
 * 启动心跳探测以监控网络往返延迟
 */
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (isChannelReady()) {
      const pingMsg = createProtocolMessage('ping');
      sendProtocolData(pingMsg);
    }
  }, 4000);
}

/**
 * 停止心跳探测
 */
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * 统一处理接收到的协议数据帧
 */
function handleIncomingProtocolData(raw: unknown) {
  const msg = parseProtocolMessage(raw);
  if (!msg) return;

  switch (msg.type) {
    case 'ping': {
      const pongMsg = createProtocolMessage('pong', { clientTimestamp: msg.timestamp });
      sendProtocolData(pongMsg);
      break;
    }
    case 'pong': {
      if (msg.payload && typeof msg.payload === 'object' && 'clientTimestamp' in msg.payload) {
        latency.value = Date.now() - Number(msg.payload.clientTimestamp);
      } else {
        latency.value = Date.now() - msg.timestamp;
      }
      break;
    }
    case 'connect-accept': {
      status.value = 'connected';
      if (msg.payload && typeof msg.payload === 'object' && 'device' in msg.payload) {
        remoteDevice.value = msg.payload.device as PeerDeviceInfo;
      }
      message.success(t('tools.p2p-file-transfer.connectedToast'));
      startHeartbeat();
      break;
    }
    case 'connect-reject': {
      status.value = 'disconnected';
      message.warning(t('tools.p2p-file-transfer.rejectedToast'));
      handleDisconnect();
      break;
    }
    case 'text': {
      const payload = parseTextMessagePayload(msg.payload);
      if (payload) {
        notesList.value.unshift({
          id: payload.id,
          text: payload.text,
          sender: 'remote',
          senderName: payload.senderDeviceName || t('tools.p2p-file-transfer.remoteDeviceLabel'),
          timestamp: msg.timestamp,
        });
        message.info(t('tools.p2p-file-transfer.receivedTextToast'));
      }
      break;
    }
    case 'file-meta': {
      const meta = parseFileMetaPayload(msg.payload);
      if (meta) {
        const receiveTask: TransferTask = {
          id: meta.transferId,
          direction: 'receive',
          fileName: meta.fileName,
          fileSize: meta.fileSize,
          fileType: meta.fileType,
          totalChunks: meta.totalChunks,
          transferredChunks: 0,
          transferredBytes: 0,
          status: 'transferring',
          progress: 0,
          speed: 0,
          startTime: Date.now(),
          lastUpdatedTime: Date.now(),
          lastTransferredBytes: 0,
        };
        transferQueue.value.unshift(receiveTask);
        receivingBuffers.set(meta.transferId, {
          meta,
          chunks: new Array(meta.totalChunks),
          receivedBytes: 0,
        });
      }
      break;
    }
    case 'file-chunk': {
      const chunk = parseFileChunkPayload(msg.payload);
      if (!chunk) break;
      const buffer = receivingBuffers.get(chunk.transferId);
      const task = transferQueue.value.find((t) => t.id === chunk.transferId);
      if (buffer && task) {
        buffer.chunks[chunk.chunkIndex] = chunk.data;
        task.transferredChunks += 1;
        const chunkLen =
          chunk.data instanceof ArrayBuffer
            ? chunk.data.byteLength
            : (chunk.data as Uint8Array).byteLength || 0;
        task.transferredBytes += chunkLen;
        task.progress =
          task.fileSize > 0
            ? Math.min(100, Math.round((task.transferredBytes / task.fileSize) * 100))
            : 100;

        // 速率采样
        const now = Date.now();
        const timeDiff = (now - task.lastUpdatedTime) / 1000;
        if (timeDiff >= 0.5) {
          const bytesDiff = task.transferredBytes - task.lastTransferredBytes;
          task.speed = Math.round(bytesDiff / timeDiff);
          task.lastUpdatedTime = now;
          task.lastTransferredBytes = task.transferredBytes;
        }

        // 传输完成判断
        if (task.transferredChunks >= task.totalChunks) {
          const blob = assembleFileBlob(buffer.chunks, buffer.meta.fileType);
          const downloadUrl = URL.createObjectURL(blob);
          task.status = 'completed';
          task.progress = 100;
          task.speed = 0;
          task.blob = blob;
          task.downloadUrl = downloadUrl;

          receivedFiles.value.unshift({
            id: task.id,
            fileName: buffer.meta.fileName,
            fileSize: buffer.meta.fileSize,
            fileType: buffer.meta.fileType,
            timestamp: Date.now(),
            blob,
            downloadUrl,
          });

          receivingBuffers.delete(chunk.transferId);

          // 发送完成确认帧
          sendProtocolData(createFileAckMessage(task.id, task.transferredChunks, true));

          if (autoDownload.value) {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = buffer.meta.fileName;
            a.click();
          }

          message.success(
            t('tools.p2p-file-transfer.fileReadyToast', { name: buffer.meta.fileName }),
          );
        }
      }
      break;
    }
    case 'file-ack': {
      const ack = parseFileAckPayload(msg.payload);
      if (ack) {
        const task = transferQueue.value.find((t) => t.id === ack.transferId);
        if (task && ack.completed) {
          task.status = 'completed';
          task.progress = 100;
        }
      }
      break;
    }
    default:
      break;
  }
}

/**
 * 绑定并处理 PeerJS 数据通道的消息与生命周期事件
 */
function attachConnectionHandlers(conn: DataConnection) {
  conn.on('data', (raw: unknown) => {
    handleIncomingProtocolData(raw);
  });

  conn.on('close', () => {
    status.value = 'disconnected';
    remoteDevice.value = null;
    latency.value = -1;
    stopHeartbeat();
    message.info(t('tools.p2p-file-transfer.disconnectedToast'));
  });

  conn.on('error', () => {
    status.value = 'error';
    stopHeartbeat();
    message.error(t('tools.p2p-file-transfer.peerError'));
  });
}

/**
 * 等待本地 ICE 候选收集就绪
 */
function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', checkState);
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, 2500);
  });
}

/**
 * 绑定原生 WebRTC DataChannel
 */
function attachNativeDataChannel(dc: RTCDataChannel) {
  airgapDc = dc;
  dc.onopen = () => {
    status.value = 'connected';
    airgapStep.value = 'connected';
    remoteDevice.value = {
      peerId: 'airgap-p2p',
      deviceType: 'unknown',
      os: 'Air-Gap Direct',
      browser: 'WebRTC DTLS',
    };
    startHeartbeat();
    message.success(t('tools.p2p-file-transfer.airgapConnectedToast'));
  };

  dc.onmessage = (event) => {
    handleIncomingProtocolData(event.data);
  };

  dc.onclose = () => {
    status.value = 'disconnected';
    remoteDevice.value = null;
    latency.value = -1;
    stopHeartbeat();
    message.info(t('tools.p2p-file-transfer.disconnectedToast'));
  };

  dc.onerror = () => {
    status.value = 'error';
    stopHeartbeat();
    message.error(t('tools.p2p-file-transfer.peerError'));
  };
}

/**
 * 离线气隙模式：发起端创建本地 Offer
 */
async function handleCreateAirgapOffer() {
  cleanupAirgap();
  isAirgapGenerating.value = true;
  status.value = 'connecting';

  try {
    airgapPc = new RTCPeerConnection({ iceServers: [] });
    airgapDc = airgapPc.createDataChannel('ateng-airgap-dc', { ordered: true });
    attachNativeDataChannel(airgapDc);

    const offer = await airgapPc.createOffer();
    await airgapPc.setLocalDescription(offer);
    await waitForIceGathering(airgapPc);

    if (airgapPc.localDescription) {
      airgapOfferText.value = compressSdp(airgapPc.localDescription.sdp);
      airgapStep.value = 'host-offer';
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    message.error('生成 Offer 失败，请检查浏览器 WebRTC 权限');
  } finally {
    isAirgapGenerating.value = false;
  }
}

/**
 * 离线气隙模式：发起端应用接收端返回的 Answer
 */
async function handleApplyAirgapAnswer() {
  if (!airgapInputAnswer.value.trim()) {
    message.warning(t('tools.p2p-file-transfer.emptyTextWarning'));
    return;
  }
  if (!airgapPc) {
    message.warning('请先生成 Offer 凭证');
    return;
  }

  try {
    const decompressed = decompressSdp(airgapInputAnswer.value.trim());
    const rawAnswerSdp = decompressed.endsWith('\r\n') ? decompressed : `${decompressed.trim()}\r\n`;
    await airgapPc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: rawAnswerSdp }));
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(err);
    message.error(`${t('tools.p2p-file-transfer.invalidSdpError')}: ${errMessage}`);
  }
}

/**
 * 离线气隙模式：接收端解析 Offer 并生成 Answer
 */
async function handleParseOfferAndGenerateAnswer() {
  if (!airgapInputOffer.value.trim()) {
    message.warning(t('tools.p2p-file-transfer.emptyTextWarning'));
    return;
  }

  cleanupAirgap();
  isAirgapGenerating.value = true;
  status.value = 'connecting';

  try {
    const decompressed = decompressSdp(airgapInputOffer.value.trim());
    const rawOfferSdp = decompressed.endsWith('\r\n') ? decompressed : `${decompressed.trim()}\r\n`;
    airgapPc = new RTCPeerConnection({ iceServers: [] });
    airgapPc.ondatachannel = (event) => {
      attachNativeDataChannel(event.channel);
    };

    await airgapPc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: rawOfferSdp }));
    const answer = await airgapPc.createAnswer();
    await airgapPc.setLocalDescription(answer);
    await waitForIceGathering(airgapPc);

    if (airgapPc.localDescription) {
      airgapAnswerText.value = compressSdp(airgapPc.localDescription.sdp);
      airgapStep.value = 'client-answer';
    }
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(err);
    message.error(`${t('tools.p2p-file-transfer.invalidSdpError')}: ${errMessage}`);
  } finally {
    isAirgapGenerating.value = false;
  }
}

/**
 * 复制 Offer 凭证
 */
async function handleCopyAirgapOffer() {
  if (!airgapOfferText.value) return;
  await copy(airgapOfferText.value);
  message.success(t('tools.p2p-file-transfer.offerCopied'));
}

/**
 * 复制 Answer 凭证
 */
async function handleCopyAirgapAnswer() {
  if (!airgapAnswerText.value) return;
  await copy(airgapAnswerText.value);
  message.success(t('tools.p2p-file-transfer.answerCopied'));
}

/**
 * 清理气隙连接资源
 */
function cleanupAirgap() {
  if (airgapDc) {
    airgapDc.close();
    airgapDc = null;
  }
  if (airgapPc) {
    airgapPc.close();
    airgapPc = null;
  }
  airgapStep.value = 'idle';
  airgapOfferText.value = '';
  airgapAnswerText.value = '';
}

/**
 * 切换连接模式
 */
function handleSwitchConnectionMode(newMode: ConnectionMode) {
  if (connectionMode.value === newMode) return;
  handleDisconnect();
  connectionMode.value = newMode;
  if (newMode === 'relay') {
    initPeer();
  } else {
    cleanupAirgap();
    status.value = 'idle';
  }
}

let currentScanTarget: 'offer' | 'answer' = 'offer';

/**
 * 启动摄像头扫描二维码
 */
async function startCameraScan(target: 'offer' | 'answer') {
  currentScanTarget = target;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    message.warning(t('tools.p2p-file-transfer.cameraPermissionError'));
    return;
  }

  showCameraModal.value = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    cameraStream = stream;
    if (cameraVideoRef.value) {
      cameraVideoRef.value.srcObject = stream;
      await cameraVideoRef.value.play();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('BarcodeDetector' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const scanLoop = async () => {
        if (!showCameraModal.value || !cameraVideoRef.value) return;
        try {
          const codes = await detector.detect(cameraVideoRef.value);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            const raw = codes[0].rawValue;
            stopCameraScan();
            if (currentScanTarget === 'offer') {
              airgapInputOffer.value = raw;
              handleParseOfferAndGenerateAnswer();
            } else {
              airgapInputAnswer.value = raw;
              handleApplyAirgapAnswer();
            }
            return;
          }
        } catch {
          // ignore detector frame errors
        }
        cameraScanFrame = requestAnimationFrame(scanLoop);
      };
      cameraScanFrame = requestAnimationFrame(scanLoop);
    }
  } catch {
    stopCameraScan();
    message.warning(t('tools.p2p-file-transfer.cameraPermissionError'));
  }
}

/**
 * 停止摄像头扫描
 */
function stopCameraScan() {
  if (cameraScanFrame) {
    cancelAnimationFrame(cameraScanFrame);
    cameraScanFrame = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  showCameraModal.value = false;
}


/**
 * 发送文本便签
 */
function handleSendText() {
  const content = textInput.value ? textInput.value.trim() : '';
  if (!content) {
    message.warning(t('tools.p2p-file-transfer.emptyTextWarning'));
    return;
  }
  if (!isChannelReady()) {
    message.warning(t('tools.p2p-file-transfer.status.disconnected'));
    return;
  }

  const myDevice = detectCurrentDeviceInfo(myPeerId.value || 'airgap-device');
  const deviceName = `${myDevice.os} (${myDevice.browser})`;
  const msg = createTextMessage(textInput.value, myPeerId.value || 'airgap-device', deviceName);
  sendProtocolData(msg);

  notesList.value.unshift({
    id: msg.payload!.id,
    text: textInput.value,
    sender: 'me',
    senderName: t('tools.p2p-file-transfer.myDevice'),
    timestamp: msg.timestamp,
  });

  textInput.value = '';
}

/**
 * 快捷读取剪贴板并发送
 */
async function handlePasteAndSend() {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    message.warning('当前浏览器环境不支持直接读取剪贴板，请手动粘贴');
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      message.warning(t('tools.p2p-file-transfer.emptyTextWarning'));
      return;
    }
    textInput.value = text;
    handleSendText();
  } catch {
    message.warning('读取系统剪贴板受阻，请手动粘贴至输入框');
  }
}

/**
 * 复制便签文本至剪贴板
 */
async function handleCopyNote(text: string) {
  await copy(text);
  message.success(t('tools.p2p-file-transfer.textCopied'));
}

/**
 * 清空便签历史列表
 */
function handleClearNotes() {
  notesList.value = [];
}

/**
 * 触发隐藏的文件选择器
 */
function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

/**
 * 触发相机/相册选择器（移动端友好）
 */
function triggerCameraInput() {
  if (cameraInputRef.value) {
    cameraInputRef.value.value = '';
    cameraInputRef.value.click();
  }
}

/**
 * 处理文件选择事件
 */
function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleQueueFiles(target.files);
  }
}

/**
 * 处理拖拽悬停
 */
function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

/**
 * 处理拖拽离开
 */
function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
}

/**
 * 处理文件拖放事件
 */
function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleQueueFiles(e.dataTransfer.files);
  }
}

/**
 * 批量加入文件传输队列
 */
function handleQueueFiles(files: FileList | File[]) {
  if (!isChannelReady()) {
    message.warning(t('tools.p2p-file-transfer.status.disconnected'));
    return;
  }
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    sendSingleFile(file);
  }
}

/**
 * 发送单个文件（分块流式传输与背压流控）
 */
async function sendSingleFile(file: File) {
  if (!isChannelReady()) return;

  const totalChunks = calculateChunkCount(file.size, DEFAULT_CHUNK_SIZE);
  const metaMsg = createFileMetaMessage(file.name, file.size, file.type, DEFAULT_CHUNK_SIZE);
  const transferId = metaMsg.payload!.transferId;

  // 1. 发送元数据广播帧
  sendProtocolData(metaMsg);

  // 2. 建立本地传输任务模型
  const task: TransferTask = {
    id: transferId,
    direction: 'send',
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
    totalChunks,
    transferredChunks: 0,
    transferredBytes: 0,
    status: 'transferring',
    progress: 0,
    speed: 0,
    startTime: Date.now(),
    lastUpdatedTime: Date.now(),
    lastTransferredBytes: 0,
  };
  transferQueue.value.unshift(task);

  // 3. 异步分块流式读取与发送
  let offset = 0;
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // 检查取消状态或连接断开
    if (task.status === 'cancelled' || !isChannelReady()) {
      break;
    }

    const chunkEnd = Math.min(offset + DEFAULT_CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(offset, chunkEnd);
    const arrayBuffer = await chunkBlob.arrayBuffer();

    // WebRTC DataChannel 背压流控：检测发送缓冲区积压
    if (getChannelBufferedAmount() > BUFFER_HIGH_WATER_MARK) {
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isChannelReady() || task.status === 'cancelled') {
            clearInterval(checkInterval);
            resolve();
          } else if (getChannelBufferedAmount() < BUFFER_LOW_WATER_MARK) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }

    if (task.status === 'cancelled' || !isChannelReady()) {
      break;
    }

    // 发送切片帧
    const chunkMsg = createFileChunkMessage(transferId, chunkIndex, arrayBuffer);
    if (connectionMode.value === 'airgap') {
      const serializableChunk = {
        ...chunkMsg,
        payload: {
          ...chunkMsg.payload,
          data: Base64.fromUint8Array(new Uint8Array(arrayBuffer)),
        },
      };
      sendProtocolData(serializableChunk);
    } else {
      sendProtocolData(chunkMsg);
    }

    offset = chunkEnd;
    task.transferredChunks = chunkIndex + 1;
    task.transferredBytes = offset;
    task.progress = file.size > 0 ? Math.min(100, Math.round((offset / file.size) * 100)) : 100;

    // 速率采样
    const now = Date.now();
    const timeDiff = (now - task.lastUpdatedTime) / 1000;
    if (timeDiff >= 0.5) {
      const bytesDiff = task.transferredBytes - task.lastTransferredBytes;
      task.speed = Math.round(bytesDiff / timeDiff);
      task.lastUpdatedTime = now;
      task.lastTransferredBytes = task.transferredBytes;
    }
  }

  if (task.status !== 'cancelled') {
    task.progress = 100;
    task.speed = 0;
    message.success(t('tools.p2p-file-transfer.fileSendSuccessToast', { name: file.name }));
  }
}

/**
 * 取消进行中的传输任务
 */
function handleCancelTransfer(taskId: string) {
  const task = transferQueue.value.find((t) => t.id === taskId);
  if (task) {
    task.status = 'cancelled';
    task.speed = 0;
    message.info(t('tools.p2p-file-transfer.transferCancelled'));
  }
}

/**
 * 触发接收文件的本地下载
 */
function handleDownloadFile(fileItem: ReceivedFileItem) {
  const a = document.createElement('a');
  a.href = fileItem.downloadUrl;
  a.download = fileItem.fileName;
  a.click();
}

/**
 * 清理已接收文件列表与内存对象 URL
 */
function handleClearReceived() {
  for (const item of receivedFiles.value) {
    if (item.downloadUrl) {
      URL.revokeObjectURL(item.downloadUrl);
    }
  }
  receivedFiles.value = [];
}

/**
 * 清除已完成或已取消的传输队列项
 */
function handleClearCompletedTasks() {
  transferQueue.value = transferQueue.value.filter((t) => t.status === 'transferring');
}

/**
 * 触发文件预览模态框（支持图片与纯文本/代码）
 */
async function handlePreviewFile(item: ReceivedFileItem) {
  previewItem.value = item;
  previewTextContent.value = '';
  showPreviewModal.value = true;

  if (isPreviewableText(item.fileType, item.fileName) && !item.fileType.startsWith('image/')) {
    isPreviewLoading.value = true;
    try {
      const text = await item.blob.text();
      previewTextContent.value = text;
    } catch {
      previewTextContent.value = '读取文件内容失败';
    } finally {
      isPreviewLoading.value = false;
    }
  }
}

/**
 * 一键将所有已接收文件打包为 ZIP 下载
 */
async function handleBatchDownloadZip() {
  if (receivedFiles.value.length === 0) {
    message.warning(t('tools.p2p-file-transfer.noFilesToZip'));
    return;
  }

  isZipping.value = true;
  message.loading(t('tools.p2p-file-transfer.packagingZip'));

  try {
    const fileBuffers = await Promise.all(
      receivedFiles.value.map(async (f) => ({
        name: f.fileName,
        data: new Uint8Array(await f.blob.arrayBuffer()),
      })),
    );

    const zipBytes = await createBatchZip(fileBuffers);
    const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
    const downloadUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `P2P_Files_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(downloadUrl);

    message.success(t('tools.p2p-file-transfer.zipPackagingSuccess'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Batch Zip Error]', err);
    message.error('打包 ZIP 失败');
  } finally {
    isZipping.value = false;
  }
}

/**
 * 断线重连
 */
function handleReconnect() {
  if (connectionMode.value === 'airgap') {
    if (airgapRole.value === 'host') {
      handleCreateAirgapOffer();
    } else {
      airgapStep.value = 'idle';
      airgapAnswerText.value = '';
    }
  } else {
    initPeer();
  }
}

/**
 * 批准待接入的对等设备
 */
function handleApproveConnection() {
  if (!pendingConn) return;

  activeConn = pendingConn;
  pendingConn = null;
  showApprovalModal.value = false;

  const currentDevice = detectCurrentDeviceInfo(myPeerId.value);
  activeConn.send(
    createProtocolMessage('connect-accept', {
      device: currentDevice,
    }),
  );

  status.value = 'connected';
  if (pendingApproval.value) {
    remoteDevice.value = pendingApproval.value.device;
  }
  startHeartbeat();
  message.success(t('tools.p2p-file-transfer.connectedToast'));
}

/**
 * 拒绝待接入的对等设备
 */
function handleRejectConnection() {
  if (pendingConn) {
    pendingConn.send(createProtocolMessage('connect-reject'));
    pendingConn.close();
    pendingConn = null;
  }
  showApprovalModal.value = false;
  pendingApproval.value = null;
  message.info(t('tools.p2p-file-transfer.rejectedToast'));
}

/**
 * 主动断开当前活动直连通道
 */
function handleDisconnect() {
  stopHeartbeat();
  if (activeConn) {
    activeConn.close();
    activeConn = null;
  }
  if (pendingConn) {
    pendingConn.close();
    pendingConn = null;
  }
  cleanupAirgap();
  status.value = 'disconnected';
  remoteDevice.value = null;
  latency.value = -1;
}

/**
 * 重新创建房间并刷新信令
 */
function handleRecreateRoom() {
  handleDisconnect();
  if (role.value === 'client') {
    // 切换为主机模式
    router.replace({ query: {} });
    role.value = 'host';
  }
  initPeer();
}

/**
 * 初始化并连接 PeerJS
 */
function initPeer() {
  if (peerInstance) {
    peerInstance.destroy();
    peerInstance = null;
  }

  stopHeartbeat();
  status.value = 'connecting';
  latency.value = -1;

  // 1. 判断角色
  const roomQuery = route.query.room as string | undefined;
  if (roomQuery && roomQuery.trim()) {
    role.value = 'client';
    targetRoomId.value = roomQuery.trim();
  } else {
    role.value = 'host';
    myPeerId.value = generateRoomId(6);
    roomShareUrl.value = buildRoomShareUrl(window.location.href, myPeerId.value);
  }

  // 2. 装配 Peer 配置选项
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let peerOptions: any = {
    debug: 1,
  };

  if (customSignaling.value.enabled && customSignaling.value.host) {
    peerOptions = {
      ...peerOptions,
      host: customSignaling.value.host,
      port: customSignaling.value.port,
      path: customSignaling.value.path,
      secure: customSignaling.value.secure,
    };
  }

  // 3. 创建 Peer 实例
  try {
    if (role.value === 'host') {
      peerInstance = new Peer(myPeerId.value, peerOptions);
    } else {
      peerInstance = new Peer(peerOptions);
    }
  } catch (err) {
    status.value = 'error';
    message.error(t('tools.p2p-file-transfer.peerError'));
    return;
  }

  // 4. 监听 Peer 打开事件
  peerInstance.on('open', (id) => {
    myPeerId.value = id;

    if (role.value === 'client') {
      // 客户端发起向主机的直连呼叫
      const conn = peerInstance!.connect(targetRoomId.value, { reliable: true });
      activeConn = conn;
      attachConnectionHandlers(conn);

      conn.on('open', () => {
        const clientDevice = detectCurrentDeviceInfo(id);
        conn.send(
          createProtocolMessage('ping', {
            device: clientDevice,
          }),
        );
      });
    } else {
      status.value = 'idle';
      roomShareUrl.value = buildRoomShareUrl(window.location.href, id);
    }
  });

  // 5. 主机端监听来自客户端的连接请求
  peerInstance.on('connection', (conn) => {
    conn.on('open', () => {
      // 客户端初次接入
      const clientDevice = detectCurrentDeviceInfo(conn.peer);
      attachConnectionHandlers(conn);

      if (autoTrust.value) {
        activeConn = conn;
        const hostDevice = detectCurrentDeviceInfo(myPeerId.value);
        conn.send(
          createProtocolMessage('connect-accept', {
            device: hostDevice,
          }),
        );
        status.value = 'connected';
        remoteDevice.value = clientDevice;
        startHeartbeat();
      } else {
        pendingConn = conn;
        pendingApproval.value = {
          peerId: conn.peer,
          device: clientDevice,
          timestamp: Date.now(),
        };
        showApprovalModal.value = true;
      }
    });
  });

  peerInstance.on('error', (err) => {
    status.value = 'error';
    // eslint-disable-next-line no-console
    console.error('[P2P File Transfer Peer Error]', err);
  });
}

// 监听路由参数变动
watch(
  () => route.query.room,
  (newRoom) => {
    if (newRoom) {
      role.value = 'client';
      targetRoomId.value = String(newRoom).trim();
    } else {
      role.value = 'host';
    }
  },
);

onMounted(() => {
  initPeer();
});

onBeforeUnmount(() => {
  stopHeartbeat();
  handleClearReceived();
  stopCameraScan();
  cleanupAirgap();
  if (activeConn) {
    activeConn.close();
    activeConn = null;
  }
  if (pendingConn) {
    pendingConn.close();
    pendingConn = null;
  }
  if (peerInstance) {
    peerInstance.destroy();
    peerInstance = null;
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部状态栏与核心指标 -->
    <n-card size="small" class="shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <n-icon :component="Devices" size="22" class="text-primary" />
          <span class="font-medium text-base">
            {{ role === 'host' ? t('tools.p2p-file-transfer.role.host') : t('tools.p2p-file-transfer.role.client') }}
          </span>
          <n-tag :type="statusTagType" round size="small" class="ml-1">
            {{ t(`tools.p2p-file-transfer.status.${status}`) }}
          </n-tag>
          <n-tag v-if="status === 'connected' && latency >= 0" type="info" round size="small">
            <template #icon>
              <n-icon :component="Wifi" />
            </template>
            {{ formatLatency(latency) }}
          </n-tag>
        </div>

        <div class="flex items-center gap-2">
          <!-- 模式切换 -->
          <n-radio-group
            :value="connectionMode"
            size="small"
            @update:value="handleSwitchConnectionMode"
          >
            <n-radio-button value="relay">
              {{ t('tools.p2p-file-transfer.modeRelay') }}
            </n-radio-button>
            <n-radio-button value="airgap">
              {{ t('tools.p2p-file-transfer.modeAirGap') }}
            </n-radio-button>
          </n-radio-group>

          <n-button
            v-if="connectionMode === 'relay'"
            size="small"
            quaternary
            @click="showSignalingModal = true"
          >
            <template #icon>
              <n-icon :component="Settings" />
            </template>
            {{ t('tools.p2p-file-transfer.customSignaling') }}
          </n-button>
          <n-button
            v-if="connectionMode === 'relay'"
            size="small"
            secondary
            @click="handleRecreateRoom"
          >
            <template #icon>
              <n-icon :component="Refresh" />
            </template>
            {{ t('tools.p2p-file-transfer.recreateRoom') }}
          </n-button>
        </div>
      </div>
    </n-card>

    <!-- 断线重连提示横幅 -->
    <n-alert v-if="status === 'disconnected'" type="warning" class="shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs">{{ t('tools.p2p-file-transfer.connectionLostTip') }}</span>
        <n-button size="tiny" type="warning" secondary @click="handleReconnect">
          <template #icon>
            <n-icon :component="Refresh" />
          </template>
          {{ t('tools.p2p-file-transfer.reconnect') }}
        </n-button>
      </div>
    </n-alert>

    <!-- 主工作区：响应式双栏排布 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左栏：连接配对与二维码区域 -->
      <div class="lg:col-span-5 min-w-0 space-y-4">
        <!-- 已连接状态卡片 -->
        <n-card v-if="status === 'connected'" class="shadow-sm" size="small">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon :component="ShieldCheck" class="text-primary" />
              <span>{{ t('tools.p2p-file-transfer.connectedDevice') }}</span>
            </div>
          </template>

          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg bg-surface border border-base">
              <n-avatar round size="large" class="bg-primary/10 text-primary">
                <n-icon :component="remoteDeviceIcon" size="24" />
              </n-avatar>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">
                  {{ remoteDevice?.os || 'Unknown Device' }} · {{ remoteDevice?.browser || 'Browser' }}
                </div>
                <div class="text-xs text-gray-400 font-mono truncate">
                  ID: {{ remoteDevice?.peerId || '--' }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-2 rounded bg-surface border border-base">
                <span class="text-gray-400">{{ t('tools.p2p-file-transfer.deviceType') }}: </span>
                <span class="font-medium uppercase">{{ remoteDevice?.deviceType || '--' }}</span>
              </div>
              <div class="p-2 rounded bg-surface border border-base">
                <span class="text-gray-400">{{ t('tools.p2p-file-transfer.latency') }}: </span>
                <span class="font-medium text-primary">{{ formatLatency(latency) }}</span>
              </div>
            </div>

            <n-button type="error" block secondary class="mt-2" @click="handleDisconnect">
              <template #icon>
                <n-icon :component="Unlink" />
              </template>
              {{ t('tools.p2p-file-transfer.disconnect') }}
            </n-button>
          </div>
        </n-card>

        <!-- 离线气隙模式未连接配对卡片 -->
        <n-card v-else-if="connectionMode === 'airgap'" class="shadow-sm" size="small">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <n-icon :component="Qrcode" class="text-primary" />
                <span>{{ t('tools.p2p-file-transfer.modeAirGap') }}</span>
              </div>
              <n-radio-group v-model:value="airgapRole" size="small" :disabled="airgapStep !== 'idle'">
                <n-radio-button value="host">
                  发起端
                </n-radio-button>
                <n-radio-button value="client">
                  接收端
                </n-radio-button>
              </n-radio-group>
            </div>
          </template>

          <!-- 发起端流程 -->
          <div v-if="airgapRole === 'host'" class="space-y-4 pt-1">
            <div v-if="airgapStep !== 'host-offer'" class="py-6 flex flex-col items-center justify-center space-y-3">
              <p class="text-xs text-gray-500 text-center leading-relaxed">
                作为发起端，点击下方按钮在本地生成专属 WebRTC Offer 凭证与二维码。
              </p>
              <n-button
                type="primary"
                :loading="isAirgapGenerating"
                @click="handleCreateAirgapOffer"
              >
                <template #icon>
                  <n-icon :component="Qrcode" />
                </template>
                {{ t('tools.p2p-file-transfer.createOfferBtn') }}
              </n-button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex flex-col items-center justify-center p-2 space-y-2">
                <div class="p-2 bg-white rounded-lg border border-base shadow-sm inline-block">
                  <img
                    v-if="airgapOfferQr"
                    :src="airgapOfferQr"
                    alt="AirGap Offer QR"
                    class="w-44 h-44 block rounded"
                  />
                </div>
                <div class="text-xs text-gray-500 text-center">
                  {{ t('tools.p2p-file-transfer.offerQrTitle') }}
                </div>
                <div class="flex gap-2">
                  <n-button size="tiny" secondary @click="handleCopyAirgapOffer">
                    <template #icon>
                      <n-icon :component="Copy" />
                    </template>
                    {{ t('tools.p2p-file-transfer.copyOfferText') }}
                  </n-button>
                  <n-button size="tiny" quaternary @click="handleCreateAirgapOffer">
                    <template #icon>
                      <n-icon :component="Refresh" />
                    </template>
                    重新生成
                  </n-button>
                </div>
                <n-input
                  :value="airgapOfferText"
                  type="textarea"
                  :rows="2"
                  readonly
                  class="font-mono text-xs w-full mt-1"
                  placeholder="Offer 凭证字符串"
                />
              </div>

              <n-divider class="my-1" />

              <div class="space-y-2">
                <div class="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {{ t('tools.p2p-file-transfer.pasteAnswerPrompt') }}
                </div>
                <n-input
                  v-model:value="airgapInputAnswer"
                  type="textarea"
                  :rows="2"
                  :placeholder="t('tools.p2p-file-transfer.answerInputPlaceholder')"
                  class="font-mono text-xs"
                />
                <div class="flex items-center justify-between gap-2">
                  <n-button size="small" secondary @click="startCameraScan('answer')">
                    <template #icon>
                      <n-icon :component="Scan" />
                    </template>
                    {{ t('tools.p2p-file-transfer.scanWithCamera') }}
                  </n-button>
                  <n-button
                    size="small"
                    type="primary"
                    :disabled="!airgapInputAnswer.trim()"
                    @click="handleApplyAirgapAnswer"
                  >
                    {{ t('tools.p2p-file-transfer.completeAirgapConnect') }}
                  </n-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 接收端流程 -->
          <div v-else class="space-y-4 pt-1">
            <div v-if="airgapStep !== 'client-answer'" class="space-y-3">
              <div class="text-xs font-medium text-gray-600 dark:text-gray-300">
                {{ t('tools.p2p-file-transfer.pasteOfferPrompt') }}
              </div>
              <n-input
                v-model:value="airgapInputOffer"
                type="textarea"
                :rows="3"
                :placeholder="t('tools.p2p-file-transfer.offerInputPlaceholder')"
                class="font-mono text-xs"
              />
              <div class="flex items-center justify-between gap-2">
                <n-button size="small" secondary @click="startCameraScan('offer')">
                  <template #icon>
                    <n-icon :component="Scan" />
                  </template>
                  {{ t('tools.p2p-file-transfer.scanWithCamera') }}
                </n-button>
                <n-button
                  size="small"
                  type="primary"
                  :loading="isAirgapGenerating"
                  :disabled="!airgapInputOffer.trim()"
                  @click="handleParseOfferAndGenerateAnswer"
                >
                  {{ t('tools.p2p-file-transfer.generateAnswerBtn') }}
                </n-button>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div class="flex flex-col items-center justify-center p-2 space-y-2">
                <div class="p-2 bg-white rounded-lg border border-base shadow-sm inline-block">
                  <img
                    v-if="airgapAnswerQr"
                    :src="airgapAnswerQr"
                    alt="AirGap Answer QR"
                    class="w-44 h-44 block rounded"
                  />
                </div>
                <div class="text-xs text-gray-500 text-center">
                  {{ t('tools.p2p-file-transfer.answerQrTitle') }}
                </div>
                <div class="flex gap-2">
                  <n-button size="tiny" secondary @click="handleCopyAirgapAnswer">
                    <template #icon>
                      <n-icon :component="Copy" />
                    </template>
                    {{ t('tools.p2p-file-transfer.copyAnswerText') }}
                  </n-button>
                  <n-button size="tiny" quaternary @click="cleanupAirgap">
                    <template #icon>
                      <n-icon :component="Refresh" />
                    </template>
                    重置重试
                  </n-button>
                </div>
                <n-input
                  :value="airgapAnswerText"
                  type="textarea"
                  :rows="2"
                  readonly
                  class="font-mono text-xs w-full mt-1"
                  placeholder="Answer 凭证字符串"
                />
              </div>
            </div>
          </div>
        </n-card>

        <!-- 云信令模式：主机端未连接状态卡片 -->
        <n-card v-else-if="role === 'host'" class="shadow-sm" size="small">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon :component="Qrcode" class="text-primary" />
              <span>{{ t('tools.p2p-file-transfer.scanQrTip') }}</span>
            </div>
          </template>

          <div class="flex flex-col items-center justify-center p-3 space-y-3">
            <div class="p-2 bg-white rounded-lg border border-base shadow-sm inline-block">
              <img
                v-if="qrcode"
                :src="qrcode"
                alt="Room QR Code"
                class="w-48 h-48 block rounded"
              />
              <div v-else class="w-48 h-48 flex items-center justify-center text-gray-400">
                <n-spin size="medium" />
              </div>
            </div>

            <div class="text-xs text-gray-500 text-center flex items-center gap-1">
              <n-spin size="small" />
              <span>{{ t('tools.p2p-file-transfer.waitingClient') }}</span>
            </div>
          </div>

          <n-divider class="my-2" />

          <!-- 取件码与直连分享链接表单 -->
          <div class="space-y-3 pt-1">
            <div>
              <div class="text-xs text-gray-500 mb-1 font-medium">
                {{ t('tools.p2p-file-transfer.roomCode') }}
              </div>
              <n-input-group>
                <n-input
                  :value="myPeerId"
                  readonly
                  placeholder="--"
                  class="font-mono font-bold tracking-wider"
                />
                <n-button type="primary" secondary @click="handleCopyRoomCode">
                  <template #icon>
                    <n-icon :component="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </div>

            <div>
              <div class="text-xs text-gray-500 mb-1 font-medium">
                {{ t('tools.p2p-file-transfer.roomUrl') }}
              </div>
              <n-input-group>
                <n-input
                  :value="roomShareUrl"
                  readonly
                  placeholder="https://..."
                  class="font-mono text-xs"
                />
                <n-button type="primary" secondary @click="handleCopyLink">
                  <template #icon>
                    <n-icon :component="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </div>
          </div>
        </n-card>

        <!-- 云信令模式：客户端接入中卡片 -->
        <n-card v-else class="shadow-sm" size="small">
          <div class="py-8 flex flex-col items-center justify-center space-y-3">
            <n-spin size="large" />
            <div class="text-sm font-medium">
              {{ t('tools.p2p-file-transfer.joinRoom') }}
            </div>
            <div class="text-xs text-gray-500 font-mono">
              {{ targetRoomId }}
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右栏：操作指引与数据就绪区域 -->
      <div class="lg:col-span-7 min-w-0 space-y-4">
        <!-- 未连接时的使用引导 -->
        <n-card v-if="status !== 'connected'" class="shadow-sm h-full" size="small">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon :component="PlayerPlay" class="text-primary" />
              <span>{{ t('tools.p2p-file-transfer.howToUse') }}</span>
              <n-tag size="tiny" round :type="connectionMode === 'airgap' ? 'warning' : 'primary'">
                {{ connectionMode === 'airgap' ? t('tools.p2p-file-transfer.modeAirGap') : t('tools.p2p-file-transfer.modeRelay') }}
              </n-tag>
            </div>
          </template>

          <!-- 纯离线气隙模式操作指引 -->
          <div v-if="connectionMode === 'airgap'" class="space-y-4 p-2 text-sm text-gray-600 dark:text-gray-300">
            <n-alert type="warning" :show-icon="true" class="mb-3 text-xs leading-relaxed">
              {{ t('tools.p2p-file-transfer.airgapUsagePreTip') }}
            </n-alert>
            <div class="flex items-start gap-3">
              <n-badge value="1" type="warning" />
              <p class="mt-0.5 leading-relaxed">
                {{ t('tools.p2p-file-transfer.airgapUsageStep1') }}
              </p>
            </div>
            <div class="flex items-start gap-3">
              <n-badge value="2" type="warning" />
              <p class="mt-0.5 leading-relaxed">
                {{ t('tools.p2p-file-transfer.airgapUsageStep2') }}
              </p>
            </div>
            <div class="flex items-start gap-3">
              <n-badge value="3" type="warning" />
              <p class="mt-0.5 leading-relaxed">
                {{ t('tools.p2p-file-transfer.airgapUsageStep3') }}
              </p>
            </div>
          </div>

          <!-- 云信令模式操作指引 -->
          <div v-else class="space-y-4 p-2 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex items-start gap-3">
              <n-badge value="1" type="info" />
              <p class="mt-0.5 leading-relaxed">
                {{ t('tools.p2p-file-transfer.usageStep1') }}
              </p>
            </div>
            <div class="flex items-start gap-3">
              <n-badge value="2" type="info" />
              <p class="mt-0.5 leading-relaxed">
                {{ t('tools.p2p-file-transfer.usageStep2') }}
              </p>
            </div>
            <div class="flex items-start gap-3">
              <n-badge value="3" type="info" />
              <p class="mt-0.5 leading-relaxed">
                {{ t('tools.p2p-file-transfer.usageStep3') }}
              </p>
            </div>
          </div>
        </n-card>

        <!-- 已连接时：文件互传与便签多标签面板 -->
        <n-card v-else class="shadow-sm min-h-[460px]" size="small">
          <n-tabs v-model:value="activeTab" type="line" animated>
            <!-- 标签 1：文件互传 -->
            <n-tab-pane name="files">
              <template #tab>
                <div class="flex items-center gap-1.5">
                  <n-icon :component="Files" />
                  <span>{{ t('tools.p2p-file-transfer.filesTab') }}</span>
                  <n-badge
                    v-if="receivedFiles.length"
                    :value="receivedFiles.length"
                    type="success"
                  />
                </div>
              </template>

              <div class="space-y-4 pt-1">
                <!-- 移动端与全端高辨识度触控操作区 -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <n-button
                    type="primary"
                    secondary
                    class="h-12 flex flex-col items-center justify-center rounded-xl"
                    @click="triggerCameraInput"
                  >
                    <template #icon>
                      <n-icon :component="Camera" size="18" />
                    </template>
                    <span class="text-xs font-medium">{{ t('tools.p2p-file-transfer.capturePhoto') }}</span>
                  </n-button>
                  <n-button
                    type="info"
                    secondary
                    class="h-12 flex flex-col items-center justify-center rounded-xl"
                    @click="triggerFileInput"
                  >
                    <template #icon>
                      <n-icon :component="Files" size="18" />
                    </template>
                    <span class="text-xs font-medium">{{ t('tools.p2p-file-transfer.selectFiles') }}</span>
                  </n-button>
                  <n-button
                    secondary
                    class="h-12 flex flex-col items-center justify-center rounded-xl col-span-2 sm:col-span-1"
                    @click="activeTab = 'notes'"
                  >
                    <template #icon>
                      <n-icon :component="Notes" size="18" />
                    </template>
                    <span class="text-xs font-medium">{{ t('tools.p2p-file-transfer.quickSendNote') }}</span>
                  </n-button>
                </div>

                <!-- 隐藏的原生输入项 -->
                <input
                  ref="fileInputRef"
                  type="file"
                  multiple
                  class="hidden"
                  @change="handleFileSelect"
                />
                <input
                  ref="cameraInputRef"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  class="hidden"
                  @change="handleFileSelect"
                />

                <!-- 文件拖拽上传区域 -->
                <div
                  class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 select-none"
                  :class="
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-base bg-surface hover:border-primary/50'
                  "
                  @dragover="handleDragOver"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop"
                  @click="triggerFileInput"
                >
                  <div class="p-2.5 rounded-full bg-primary/10 text-primary">
                    <n-icon :component="Upload" size="26" />
                  </div>
                  <div class="font-medium text-xs sm:text-sm">
                    {{ t('tools.p2p-file-transfer.uploadAreaTitle') }}
                  </div>
                  <div class="text-[11px] text-gray-400">
                    {{ t('tools.p2p-file-transfer.uploadAreaSub') }}
                  </div>
                </div>

                <!-- 辅助配置选项 -->
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <n-checkbox v-model:checked="autoDownload">
                    {{ t('tools.p2p-file-transfer.autoDownload') }}
                  </n-checkbox>
                  <div class="flex items-center gap-2">
                    <n-button
                      v-if="transferQueue.some((t) => t.status !== 'transferring')"
                      size="tiny"
                      quaternary
                      @click="handleClearCompletedTasks"
                    >
                      清空已结束任务
                    </n-button>
                    <n-button
                      v-if="receivedFiles.length"
                      size="tiny"
                      quaternary
                      type="error"
                      @click="handleClearReceived"
                    >
                      <template #icon>
                        <n-icon :component="Trash" />
                      </template>
                      {{ t('tools.p2p-file-transfer.clearReceived') }}
                    </n-button>
                  </div>
                </div>

                <!-- 传输中队列 -->
                <div v-if="transferQueue.length" class="space-y-2">
                  <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {{ t('tools.p2p-file-transfer.activeTransfers') }} ({{ transferQueue.length }})
                  </div>
                  <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div
                      v-for="task in transferQueue"
                      :key="task.id"
                      class="p-2.5 rounded-lg border border-base bg-surface space-y-1.5"
                    >
                      <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                          <n-tag
                            :type="task.direction === 'send' ? 'primary' : 'info'"
                            size="tiny"
                            round
                          >
                            <template #icon>
                              <n-icon :component="task.direction === 'send' ? Upload : Download" />
                            </template>
                            {{
                              task.direction === 'send'
                                ? t('tools.p2p-file-transfer.sendingTag')
                                : t('tools.p2p-file-transfer.receivingTag')
                            }}
                          </n-tag>
                          <span class="font-medium truncate" :title="task.fileName">
                            {{ task.fileName }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class="text-gray-400 font-mono">
                            {{ formatFileSize(task.transferredBytes) }} / {{ formatFileSize(task.fileSize) }}
                          </span>
                          <n-tag
                            v-if="task.status === 'completed'"
                            type="success"
                            size="tiny"
                            round
                          >
                            已完成
                          </n-tag>
                          <n-tag
                            v-else-if="task.status === 'cancelled'"
                            type="default"
                            size="tiny"
                            round
                          >
                            已取消
                          </n-tag>
                          <n-button
                            v-if="task.status === 'transferring'"
                            size="tiny"
                            quaternary
                            type="error"
                            @click="handleCancelTransfer(task.id)"
                          >
                            <template #icon>
                              <n-icon :component="X" />
                            </template>
                            {{ t('tools.p2p-file-transfer.cancelTransfer') }}
                          </n-button>
                        </div>
                      </div>

                      <n-progress
                        type="line"
                        :percentage="task.progress"
                        :status="task.status === 'completed' ? 'success' : task.status === 'cancelled' ? 'warning' : 'info'"
                        :show-indicator="false"
                        :height="6"
                      />

                      <div class="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                        <span>
                          {{ task.status === 'transferring' ? formatTransferSpeed(task.speed) : '--' }}
                        </span>
                        <span>{{ task.progress }}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 已接收就绪文件列表 -->
                <div v-if="receivedFiles.length" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {{ t('tools.p2p-file-transfer.receivedFiles') }} ({{ receivedFiles.length }})
                    </div>
                    <div class="flex items-center gap-2">
                      <n-button
                        size="tiny"
                        type="primary"
                        secondary
                        :loading="isZipping"
                        @click="handleBatchDownloadZip"
                      >
                        <template #icon>
                          <n-icon :component="Archive" />
                        </template>
                        {{ t('tools.p2p-file-transfer.batchDownloadZip') }}
                      </n-button>
                    </div>
                  </div>
                  <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div
                      v-for="fileItem in receivedFiles"
                      :key="fileItem.id"
                      class="flex items-center justify-between p-2.5 rounded-lg border border-base bg-surface hover:border-primary/30 transition-all"
                    >
                      <div class="flex items-center gap-2.5 min-w-0 mr-2">
                        <img
                          v-if="isPreviewableImage(fileItem.fileType, fileItem.fileName)"
                          :src="fileItem.downloadUrl"
                          :alt="fileItem.fileName"
                          class="w-10 h-10 object-cover rounded border border-base shrink-0 cursor-pointer hover:opacity-85"
                          @click="handlePreviewFile(fileItem)"
                        />
                        <n-avatar v-else round size="small" class="bg-primary/10 text-primary shrink-0">
                          <n-icon :component="File" size="18" />
                        </n-avatar>
                        <div class="min-w-0">
                          <div class="text-xs font-medium truncate" :title="fileItem.fileName">
                            {{ fileItem.fileName }}
                          </div>
                          <div class="text-[11px] text-gray-400 font-mono">
                            {{ formatFileSize(fileItem.fileSize) }} · {{ new Date(fileItem.timestamp).toLocaleTimeString() }}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <n-button
                          v-if="isPreviewableImage(fileItem.fileType, fileItem.fileName) || isPreviewableText(fileItem.fileType, fileItem.fileName)"
                          size="tiny"
                          secondary
                          @click="handlePreviewFile(fileItem)"
                        >
                          <template #icon>
                            <n-icon :component="Eye" />
                          </template>
                          {{ t('tools.p2p-file-transfer.preview') }}
                        </n-button>
                        <n-button
                          size="tiny"
                          type="primary"
                          secondary
                          @click="handleDownloadFile(fileItem)"
                        >
                          <template #icon>
                            <n-icon :component="Download" />
                          </template>
                          {{ t('tools.p2p-file-transfer.saveFile') }}
                        </n-button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 无文件时的占位 -->
                <div
                  v-if="!transferQueue.length && !receivedFiles.length"
                  class="py-8 text-center text-gray-400 text-xs"
                >
                  {{ t('tools.p2p-file-transfer.noReceivedFiles') }}
                </div>
              </div>
            </n-tab-pane>

            <!-- 标签 2：即时文本便签 -->
            <n-tab-pane name="notes">
              <template #tab>
                <div class="flex items-center gap-1.5">
                  <n-icon :component="Notes" />
                  <span>{{ t('tools.p2p-file-transfer.textTab') }}</span>
                  <n-badge v-if="notesList.length" :value="notesList.length" type="info" />
                </div>
              </template>

              <div class="space-y-4 pt-1">
                <!-- 输入区与操作按钮 -->
                <div class="space-y-2">
                  <n-input
                    v-model:value="textInput"
                    type="textarea"
                    :rows="3"
                    :placeholder="t('tools.p2p-file-transfer.textPlaceholder')"
                    @keydown.ctrl.enter="handleSendText"
                    @keydown.meta.enter="handleSendText"
                  />
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs text-gray-400">Ctrl + Enter / ⌘ + Enter 快捷发送</span>
                    <div class="flex items-center gap-2">
                      <n-button size="small" secondary @click="handlePasteAndSend">
                        <template #icon>
                          <n-icon :component="Clipboard" />
                        </template>
                        {{ t('tools.p2p-file-transfer.pasteAndSend') }}
                      </n-button>
                      <n-button
                        size="small"
                        type="primary"
                        :disabled="!textInput.trim()"
                        @click="handleSendText"
                      >
                        <template #icon>
                          <n-icon :component="Send" />
                        </template>
                        {{ t('tools.p2p-file-transfer.sendText') }}
                      </n-button>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    便签历史 ({{ notesList.length }})
                  </div>
                  <n-button
                    v-if="notesList.length"
                    quaternary
                    size="tiny"
                    type="error"
                    @click="handleClearNotes"
                  >
                    <template #icon>
                      <n-icon :component="Trash" />
                    </template>
                    {{ t('tools.p2p-file-transfer.clearHistory') }}
                  </n-button>
                </div>

                <!-- 便签时间轴列表 -->
                <div v-if="notesList.length" class="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  <div
                    v-for="note in notesList"
                    :key="note.id"
                    class="p-3 rounded-lg border transition-all"
                    :class="
                      note.sender === 'me'
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-surface border-base'
                    "
                  >
                    <div class="flex items-center justify-between mb-1.5 text-xs">
                      <div class="flex items-center gap-1.5">
                        <n-tag
                          :type="note.sender === 'me' ? 'primary' : 'default'"
                          size="tiny"
                          round
                        >
                          {{ note.senderName }}
                        </n-tag>
                        <span class="text-gray-400">
                          {{ new Date(note.timestamp).toLocaleTimeString() }}
                        </span>
                      </div>
                      <n-button size="tiny" quaternary @click="handleCopyNote(note.text)">
                        <template #icon>
                          <n-icon :component="Copy" />
                        </template>
                        {{ t('tools.p2p-file-transfer.copyText') }}
                      </n-button>
                    </div>
                    <div
                      class="text-sm whitespace-pre-wrap break-all leading-relaxed select-text font-mono"
                    >
                      {{ note.text }}
                    </div>
                  </div>
                </div>
                <div v-else class="py-12 text-center text-gray-400 text-xs">
                  {{ t('tools.p2p-file-transfer.noNotes') }}
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>
    </div>

    <!-- 接入授权申请确认弹窗 -->
    <n-modal
      v-model:show="showApprovalModal"
      preset="dialog"
      :title="t('tools.p2p-file-transfer.connectionRequestTitle')"
      :show-icon="false"
      class="max-w-md"
    >
      <div class="space-y-4 py-2">
        <p class="text-sm">
          {{
            t('tools.p2p-file-transfer.connectionRequestDesc', {
              device: `${pendingApproval?.device.os || 'Unknown OS'} (${pendingApproval?.device.browser || 'Browser'})`,
            })
          }}
        </p>

        <div class="p-3 bg-surface rounded border border-base text-xs space-y-1 font-mono">
          <div>Peer ID: {{ pendingApproval?.peerId }}</div>
          <div>Type: {{ pendingApproval?.device.deviceType }}</div>
        </div>

        <n-checkbox v-model:checked="autoTrust">
          {{ t('tools.p2p-file-transfer.autoTrust') }}
        </n-checkbox>
      </div>

      <template #action>
        <div class="flex justify-end gap-2">
          <n-button @click="handleRejectConnection">
            {{ t('tools.p2p-file-transfer.reject') }}
          </n-button>
          <n-button type="primary" @click="handleApproveConnection">
            {{ t('tools.p2p-file-transfer.allow') }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 自定义信令配置弹窗 -->
    <n-modal
      v-model:show="showSignalingModal"
      preset="card"
      :title="t('tools.p2p-file-transfer.customSignaling')"
      class="max-w-lg"
    >
      <div class="space-y-4 text-sm">
        <p class="text-xs text-gray-500">
          {{ t('tools.p2p-file-transfer.customSignalingDesc') }}
        </p>

        <n-form label-placement="left" label-width="120" size="small">
          <n-form-item :label="t('tools.p2p-file-transfer.signalingHost')">
            <n-input
              v-model:value="customSignaling.host"
              placeholder="e.g. 192.168.1.100 or peer.example.com"
            />
          </n-form-item>

          <n-form-item :label="t('tools.p2p-file-transfer.signalingPort')">
            <n-input-number
              v-model:value="customSignaling.port"
              :min="1"
              :max="65535"
              class="w-full"
            />
          </n-form-item>

          <n-form-item :label="t('tools.p2p-file-transfer.signalingPath')">
            <n-input v-model:value="customSignaling.path" placeholder="/" />
          </n-form-item>

          <n-form-item :label="t('tools.p2p-file-transfer.signalingSecure')">
            <n-switch v-model:value="customSignaling.secure" />
          </n-form-item>
        </n-form>

        <div class="flex justify-end gap-2 pt-2">
          <n-button
            secondary
            @click="
              customSignaling.enabled = false;
              customSignaling.host = '';
              showSignalingModal = false;
              handleRecreateRoom();
            "
          >
            {{ t('tools.p2p-file-transfer.resetConfig') }}
          </n-button>
          <n-button
            type="primary"
            @click="
              customSignaling.enabled = Boolean(customSignaling.host);
              showSignalingModal = false;
              handleRecreateRoom();
            "
          >
            {{ t('tools.p2p-file-transfer.saveConfig') }}
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 摄像头扫码识别模态框 -->
    <n-modal
      v-model:show="showCameraModal"
      preset="card"
      :title="t('tools.p2p-file-transfer.cameraScanTitle')"
      class="max-w-md"
      :on-after-leave="stopCameraScan"
    >
      <div class="space-y-3 flex flex-col items-center">
        <div class="relative w-full aspect-square max-w-[280px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-base">
          <video
            ref="cameraVideoRef"
            autoplay
            playsinline
            muted
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-4 border-2 border-primary border-dashed rounded-lg pointer-events-none opacity-70 animate-pulse" />
        </div>
        <div class="text-xs text-gray-500 text-center">
          {{ t('tools.p2p-file-transfer.cameraScanning') }}
        </div>
      </div>
      <template #action>
        <div class="flex justify-end">
          <n-button secondary @click="stopCameraScan">
            关闭
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 文件轻量在线预览模态框 -->
    <n-modal
      v-model:show="showPreviewModal"
      preset="card"
      :title="t('tools.p2p-file-transfer.previewModalTitle', { name: previewItem?.fileName || '' })"
      class="max-w-2xl"
    >
      <div v-if="previewItem" class="flex flex-col items-center justify-center p-2">
        <!-- 图片预览 -->
        <div v-if="isPreviewableImage(previewItem.fileType, previewItem.fileName)" class="max-w-full text-center">
          <img
            :src="previewItem.downloadUrl"
            :alt="previewItem.fileName"
            class="max-w-full max-h-[70vh] object-contain rounded border border-base shadow-sm"
          />
        </div>

        <!-- 纯文本与代码预览 -->
        <div
          v-else-if="isPreviewableText(previewItem.fileType, previewItem.fileName)"
          class="w-full"
        >
          <n-spin v-if="isPreviewLoading" size="medium" class="w-full py-12 flex justify-center" />
          <pre
            v-else
            class="font-mono text-xs whitespace-pre-wrap break-all max-h-[65vh] overflow-y-auto select-text p-3 bg-surface rounded border border-base"
          >{{ previewTextContent }}</pre>
        </div>

        <!-- 不支持预览时的兜底 -->
        <div v-else class="py-8 text-center text-gray-400 text-sm">
          {{ t('tools.p2p-file-transfer.previewNotSupported') }}
        </div>
      </div>

      <template #action>
        <div class="flex justify-between items-center w-full">
          <span class="text-xs text-gray-400 font-mono">
            {{ previewItem ? formatFileSize(previewItem.fileSize) : '' }}
          </span>
          <div class="flex gap-2">
            <n-button secondary @click="showPreviewModal = false">
              关闭
            </n-button>
            <n-button
              v-if="previewItem"
              type="primary"
              @click="handleDownloadFile(previewItem)"
            >
              <template #icon>
                <n-icon :component="Download" />
              </template>
              {{ t('tools.p2p-file-transfer.saveFile') }}
            </n-button>
          </div>
        </div>
      </template>
    </n-modal>
  </div>
</template>
