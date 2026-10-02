/**
 * 全局命令面板选项类型契约 (Command Option Descriptor)
 *
 * @author Ateng
 * @since 2026-10-02
 */
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { MatchCueType } from '@/composable/toolSearch';

export interface PaletteOption {
  id?: string;
  name: string;
  description?: string;
  icon?: Component;
  action?: () => void;
  to?: RouteLocationRaw;
  category: string;
  toolCategory?: string;
  keywords?: string[];
  href?: string;
  closeOnSelect?: boolean;
  matchRange?: [number, number];
  matchCueType?: MatchCueType;
  matchCueValue?: string;
}
