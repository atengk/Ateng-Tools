/**
 * 证件照制作工坊 (ID Photo Maker) 类型契约与模型定义
 *
 * @author Ateng
 * @since 2026-10-02
 */

/**
 * 规格分类
 */
export type PhotoSpecCategory = 'common' | 'exam' | 'certificate' | 'custom';

/**
 * 尺寸单位
 */
export type DimensionUnit = 'mm' | 'px';

/**
 * 单张证件照规格预设接口
 */
export interface PhotoSpec {
  /** 唯一规格标识符 */
  id: string;
  /** 多语言名称 key */
  nameKey: string;
  /** 规格所属业务分类 */
  category: PhotoSpecCategory;
  /** 物理宽度 (毫米 mm) */
  widthMm: number;
  /** 物理高度 (毫米 mm) */
  heightMm: number;
  /** 300 DPI 基准下的像素宽度 */
  widthPx: number;
  /** 300 DPI 基准下的像素高度 */
  heightPx: number;
  /** 目标推荐分辨率 DPI (通常为 300) */
  dpi: number;
  /** 简短说明多语言 key (可选) */
  descriptionKey?: string;
}

/**
 * 自定义规格配置
 */
export interface CustomSpecConfig {
  /** 宽度数值 */
  width: number;
  /** 高度数值 */
  height: number;
  /** 尺寸单位 */
  unit: DimensionUnit;
  /** 分辨率 DPI */
  dpi: number;
}

/**
 * 人像空间几何变换参数
 */
export interface PortraitTransform {
  /** X 轴水平位移 (像素) */
  x: number;
  /** Y 轴垂直位移 (像素) */
  y: number;
  /** 缩放比例因子 (0.1 ~ 5.0) */
  scale: number;
  /** 顺时针旋转角度 (-180 ~ 180 度) */
  rotation: number;
}

/**
 * 合规参考线配置
 */
export interface GuidelineConfig {
  /** 是否在主视窗渲染合规网格 */
  showGuidelines: boolean;
  /** 头顶距离上边框比例 (默认 0.12) */
  headTopRatio: number;
  /** 眼睛水平对齐基线距离上边框比例 (默认 0.45) */
  eyeLineRatio: number;
  /** 下巴基线距离上边框比例 (默认 0.75) */
  chinLineRatio: number;
}

/**
 * 背景填充模式与参数
 */
export type BackgroundFillType = 'solid' | 'gradient' | 'transparent';

export interface BackgroundConfig {
  /** 填充模式 */
  type: BackgroundFillType;
  /** 纯色 HEX 颜色值 (如 #FFFFFF) */
  color: string;
  /** 渐变起始颜色 */
  gradientStart?: string;
  /** 渐变结束颜色 */
  gradientEnd?: string;
}

/**
 * 色彩容差抠图与画笔工具类型
 */
export type MattingToolMode = 'none' | 'eyedropper' | 'erase' | 'restore';

export interface MattingConfig {
  /** 是否启用色差容差抠图 */
  enabled: boolean;
  /** 背景基准色 (RGB 0~255) */
  baseColor: { r: number; g: number; b: number } | null;
  /** 色差欧几里得容差阈值 (0 ~ 100) */
  tolerance: number;
  /** 边缘高斯/箱式羽化半径 (0 ~ 10 像素) */
  feather: number;
  /** 当前激活的手动微调工具 */
  activeTool: MattingToolMode;
  /** 修容画笔半径 (5 ~ 100 像素) */
  brushSize: number;
  /** 修容画笔硬度 (0.1 ~ 1.0) */
  brushHardness: number;
}

/**
 * 冲印相纸规格
 */
export type PrintPaperType = '5-inch' | '6-inch';
export type PrintPaperOrientation = 'landscape' | 'portrait';

export interface PrintPaperConfig {
  /** 相纸尺寸类别 (5寸 / 6寸) */
  paperType: PrintPaperType;
  /** 相纸朝向 (横向 landscape / 纵向 portrait) */
  orientation: PrintPaperOrientation;
  /** 照片之间的间距 (毫米 mm，默认 2mm) */
  gapMm: number;
  /** 相纸四周留白边距 (毫米 mm，默认 3mm) */
  marginMm: number;
  /** 是否绘制十字裁切虚线标记 */
  showCutMarks: boolean;
  /** 冲印相纸输出 DPI (默认 300 DPI) */
  dpi: number;
}

/**
 * 冲印排版计算结果
 */
export interface PrintLayoutResult {
  /** 相纸像素宽度 */
  paperWidthPx: number;
  /** 相纸像素高度 */
  paperHeightPx: number;
  /** 排版列数 */
  cols: number;
  /** 排版行数 */
  rows: number;
  /** 总可容纳照片数量 */
  totalCount: number;
  /** 单张照片在排版图上的像素宽度 */
  itemWidthPx: number;
  /** 单张照片在排版图上的像素高度 */
  itemHeightPx: number;
  /** 各照片在相纸上的精确坐标矩阵 */
  items: Array<{ x: number; y: number; width: number; height: number }>;
  /** 十字裁切虚线线段集合 */
  cutLines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

/**
 * 目标文件大小二分压缩配置
 */
export interface TargetKbConfig {
  /** 是否启用按目标文件大小限制导出 */
  enabled: boolean;
  /** 目标体积上限 (KB) */
  targetKb: number;
  /** 质量降至最低后仍超标时，是否允许自动等比下采样像素尺寸 */
  allowDownscale: boolean;
}

/**
 * 导出格式选项
 */
export type ExportImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * 导出成品结果
 */
export interface ExportPhotoResult {
  /** 导出的二进制数据 */
  blob: Blob;
  /** 资源 Object URL */
  url: string;
  /** 输出像素宽度 */
  width: number;
  /** 输出像素高度 */
  height: number;
  /** 文件大小 (字节) */
  sizeBytes: number;
  /** 文件大小 (KB) */
  sizeKb: number;
  /** 导出的格式 */
  format: ExportImageFormat;
  /** 实际质量因子 (0.01 ~ 1.0) */
  quality: number;
  /** 是否触发了下采样缩放保护 */
  wasDownscaled: boolean;
}

/**
 * 内置官方标准规格预设字典
 */
export const PHOTO_SPEC_PRESETS: PhotoSpec[] = [
  // 常用基础
  {
    id: 'one-inch',
    nameKey: 'tools.id-photo-maker.specs.oneInch',
    category: 'common',
    widthMm: 25,
    heightMm: 35,
    widthPx: 295,
    heightPx: 413,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.oneInchDesc',
  },
  {
    id: 'two-inch',
    nameKey: 'tools.id-photo-maker.specs.twoInch',
    category: 'common',
    widthMm: 35,
    heightMm: 49,
    widthPx: 413,
    heightPx: 579,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.twoInchDesc',
  },
  {
    id: 'small-one-inch',
    nameKey: 'tools.id-photo-maker.specs.smallOneInch',
    category: 'common',
    widthMm: 22,
    heightMm: 32,
    widthPx: 260,
    heightPx: 378,
    dpi: 300,
  },
  {
    id: 'big-one-inch',
    nameKey: 'tools.id-photo-maker.specs.bigOneInch',
    category: 'common',
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
    dpi: 300,
  },
  {
    id: 'small-two-inch',
    nameKey: 'tools.id-photo-maker.specs.smallTwoInch',
    category: 'common',
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.smallTwoInchDesc',
  },
  {
    id: 'big-two-inch',
    nameKey: 'tools.id-photo-maker.specs.bigTwoInch',
    category: 'common',
    widthMm: 35,
    heightMm: 53,
    widthPx: 413,
    heightPx: 626,
    dpi: 300,
  },
  // 资格考试
  {
    id: 'teacher-cert',
    nameKey: 'tools.id-photo-maker.specs.teacherCert',
    category: 'exam',
    widthMm: 25,
    heightMm: 35,
    widthPx: 295,
    heightPx: 413,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.teacherCertDesc',
  },
  {
    id: 'ncre',
    nameKey: 'tools.id-photo-maker.specs.ncre',
    category: 'exam',
    widthMm: 30,
    heightMm: 40,
    widthPx: 354,
    heightPx: 472,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.ncreDesc',
  },
  {
    id: 'civil-servant',
    nameKey: 'tools.id-photo-maker.specs.civilServant',
    category: 'exam',
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.civilServantDesc',
  },
  {
    id: 'cpa',
    nameKey: 'tools.id-photo-maker.specs.cpa',
    category: 'exam',
    widthMm: 25,
    heightMm: 35,
    widthPx: 295,
    heightPx: 413,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.cpaDesc',
  },
  {
    id: 'postgrad-exam',
    nameKey: 'tools.id-photo-maker.specs.postgradExam',
    category: 'exam',
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.postgradExamDesc',
  },
  // 证照签证
  {
    id: 'passport-cn',
    nameKey: 'tools.id-photo-maker.specs.passportCn',
    category: 'certificate',
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.passportCnDesc',
  },
  {
    id: 'driving-license',
    nameKey: 'tools.id-photo-maker.specs.drivingLicense',
    category: 'certificate',
    widthMm: 22,
    heightMm: 32,
    widthPx: 260,
    heightPx: 378,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.drivingLicenseDesc',
  },
  {
    id: 'social-security',
    nameKey: 'tools.id-photo-maker.specs.socialSecurity',
    category: 'certificate',
    widthMm: 26,
    heightMm: 32,
    widthPx: 307,
    heightPx: 378,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.socialSecurityDesc',
  },
  {
    id: 'visa-us',
    nameKey: 'tools.id-photo-maker.specs.visaUs',
    category: 'certificate',
    widthMm: 51,
    heightMm: 51,
    widthPx: 602,
    heightPx: 602,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.visaUsDesc',
  },
  {
    id: 'visa-jp',
    nameKey: 'tools.id-photo-maker.specs.visaJp',
    category: 'certificate',
    widthMm: 45,
    heightMm: 45,
    widthPx: 531,
    heightPx: 531,
    dpi: 300,
    descriptionKey: 'tools.id-photo-maker.specs.visaJpDesc',
  },
];

/**
 * 经典底色配置集合
 */
export const BACKGROUND_COLOR_PRESETS = [
  { id: 'white', nameKey: 'tools.id-photo-maker.bg.white', color: '#FFFFFF', type: 'solid' },
  { id: 'blue', nameKey: 'tools.id-photo-maker.bg.blue', color: '#438EDB', type: 'solid' },
  { id: 'light-blue', nameKey: 'tools.id-photo-maker.bg.lightBlue', color: '#3B99FC', type: 'solid' },
  { id: 'red', nameKey: 'tools.id-photo-maker.bg.red', color: '#DE1B1B', type: 'solid' },
  { id: 'dark-red', nameKey: 'tools.id-photo-maker.bg.darkRed', color: '#C00000', type: 'solid' },
  { id: 'gray', nameKey: 'tools.id-photo-maker.bg.gray', color: '#CCCCCC', type: 'solid' },
  {
    id: 'gradient-blue',
    nameKey: 'tools.id-photo-maker.bg.gradientBlue',
    color: '#438EDB',
    type: 'gradient',
    gradientStart: '#438EDB',
    gradientEnd: '#87CEEB',
  },
  {
    id: 'gradient-red',
    nameKey: 'tools.id-photo-maker.bg.gradientRed',
    color: '#DE1B1B',
    type: 'gradient',
    gradientStart: '#DE1B1B',
    gradientEnd: '#FA8072',
  },
  { id: 'transparent', nameKey: 'tools.id-photo-maker.bg.transparent', color: '', type: 'transparent' },
] as const;

/**
 * 冲印相纸物理参数常量 (毫米)
 */
export const PRINT_PAPER_DIMENSIONS = {
  '5-inch': { widthMm: 89, heightMm: 127 },
  '6-inch': { widthMm: 102, heightMm: 152 },
} as const;
