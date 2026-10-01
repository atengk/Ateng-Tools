/**
 * P2P 局域网快传类型契约定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/**
 * 跨端网络连接生命周期状态
 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * 设备硬件与平台分类
 */
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown';

/**
 * 对等端设备与环境特征指纹
 */
export interface PeerDeviceInfo {
  peerId: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
}

/**
 * 自定义 PeerServer 信令服务配置项
 */
export interface CustomPeerConfig {
  enabled: boolean;
  host: string;
  port: number;
  path: string;
  secure: boolean;
}

/**
 * 接入请求审批交互模型
 */
export interface ConnectionRequestApproval {
  peerId: string;
  device: PeerDeviceInfo;
  timestamp: number;
}

/**
 * 协议消息帧类型枚举
 */
export type ProtocolMessageType =
  | 'connect-accept'
  | 'connect-reject'
  | 'ping'
  | 'pong'
  | 'text'
  | 'file-meta'
  | 'file-chunk'
  | 'file-ack';

/**
 * WebRTC DataChannel 统一包装协议帧
 */
export interface ProtocolMessage<T = unknown> {
  type: ProtocolMessageType;
  payload?: T;
  timestamp: number;
}

/**
 * 文本便签传输数据载荷
 */
export interface TextPayload {
  id: string;
  text: string;
  senderPeerId: string;
  senderDeviceName: string;
}

/**
 * 视图层呈现的便签消息模型
 */
export interface TextNoteItem {
  id: string;
  text: string;
  sender: 'me' | 'remote';
  senderName: string;
  timestamp: number;
}

/**
 * 文件元数据传输载荷
 */
export interface FileMetaPayload {
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
}

/**
 * 文件切片数据传输载荷
 */
export interface FileChunkPayload {
  transferId: string;
  chunkIndex: number;
  data: ArrayBuffer | Uint8Array;
}

/**
 * 文件传输进度或完成确认载荷
 */
export interface FileAckPayload {
  transferId: string;
  receivedChunks: number;
  completed: boolean;
}

/**
 * 传输任务状态机枚举
 */
export type TransferTaskStatus =
  | 'pending'
  | 'transferring'
  | 'completed'
  | 'cancelled'
  | 'error';

/**
 * 传输任务跟踪实体
 */
export interface TransferTask {
  id: string;
  direction: 'send' | 'receive';
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  transferredChunks: number;
  transferredBytes: number;
  status: TransferTaskStatus;
  progress: number;
  speed: number;
  startTime: number;
  lastUpdatedTime: number;
  lastTransferredBytes: number;
  blob?: Blob;
  downloadUrl?: string;
}

/**
 * 已经接收完毕并供保存/预览的文件条目
 */
export interface ReceivedFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  blob: Blob;
  downloadUrl: string;
}

/**
 * 连接模式：云信令模式或离线气隙模式
 */
export type ConnectionMode = 'relay' | 'airgap';

/**
 * 离线气隙 SDP 握手流程阶段
 */
export type AirGapStep =
  | 'idle'
  | 'host-offer'
  | 'client-offer-input'
  | 'client-answer'
  | 'host-answer-input'
  | 'connected';



