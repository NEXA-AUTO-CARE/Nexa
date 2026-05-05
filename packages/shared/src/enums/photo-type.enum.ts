export const PhotoType = {
  BEFORE: 'before',
  AFTER: 'after',
} as const;
export type PhotoType = (typeof PhotoType)[keyof typeof PhotoType];
