export const AUTO_VARIABLES = ['firstName'] as const;
export type AutoVariable = (typeof AUTO_VARIABLES)[number];
