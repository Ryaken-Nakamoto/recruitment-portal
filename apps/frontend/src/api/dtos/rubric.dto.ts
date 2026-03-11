export interface ScreeningCriteriaDto {
  id: number;
  name: string;
  oneDescription: string;
  twoDescription: string;
  threeDescription: string;
  score: number | null;
}

export interface ScreeningRubricDto {
  id: number;
  name: string;
  criteria: ScreeningCriteriaDto[];
}

export interface InterviewCriteriaDto {
  id: number;
  name: string;
  question: string;
  criteria: string;
  maxScore: number;
  score: number | null;
}

export interface InterviewRubricDto {
  id: number;
  name: string;
  criteria: InterviewCriteriaDto[];
}

export interface RubricsResponse {
  screening: ScreeningRubricDto[];
  interview: InterviewRubricDto[];
}
