export const AUTO_VARIABLES = ['firstName', 'lastName'] as const;
export type AutoVariable = (typeof AUTO_VARIABLES)[number];
