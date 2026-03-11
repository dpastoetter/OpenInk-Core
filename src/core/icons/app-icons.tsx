/**
 * Lucide icons for app launcher tiles.
 * Used when we want library icons instead of emoji/legacy SVG. Fallback remains legacy-svg + iconFallback.
 */
import type { ComponentType } from 'preact';
import {
  FileText,
  Calculator,
  LayoutGrid,
  BookOpen,
  BookMarked,
  TrendingUp,
  Bomb,
  Newspaper,
  MessageCircle,
  Timer,
  Grid3x3,
  Clock,
  CloudSun,
  Globe,
  Settings,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean; size?: number }>;

const APP_ICONS: Partial<Record<string, IconComponent>> = {
  blog: FileText as IconComponent,
  calculator: Calculator as IconComponent,
  chess: LayoutGrid as IconComponent,
  comics: BookOpen as IconComponent,
  dictionary: BookMarked as IconComponent,
  finance: TrendingUp as IconComponent,
  minesweeper: Bomb as IconComponent,
  news: Newspaper as IconComponent,
  reddit: MessageCircle as IconComponent,
  stopwatch: Timer as IconComponent,
  sudoku: Grid3x3 as IconComponent,
  timer: Clock as IconComponent,
  weather: CloudSun as IconComponent,
  worldclock: Globe as IconComponent,
  settings: Settings as IconComponent,
};

export function getAppIcon(appId: string): IconComponent | null {
  return APP_ICONS[appId] ?? null;
}
