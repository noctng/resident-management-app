import type { AmenityType } from '../types';

export const AMENITY_NAMES: Record<AmenityType, string> = {
  GOLF_3D: 'Golf 3D',
  HORSE_RIDING: 'Cưỡi ngựa Ả Rập',
  MUSEUM: 'Thăm quan bảo tàng',
  ZEN_GARDEN: 'Thăm quan vườn Zen',
  SAUNA: 'Xông Hơi',
  ARCHERY: 'Bắn Cung',
  GYM: 'Gym',
  YOGA: 'Yoga',
};

export const AMENITY_ICONS: Record<AmenityType, string> = {
  GOLF_3D: '⛳',
  HORSE_RIDING: '🐴',
  MUSEUM: '🏛️',
  ZEN_GARDEN: '🌿',
  SAUNA: '🧖',
  ARCHERY: '🏹',
  GYM: '💪',
  YOGA: '🧘',
};
