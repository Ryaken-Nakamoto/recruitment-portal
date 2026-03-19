import { describe, it, expect } from 'vitest';
import {
  computePreview,
  comb,
  combinations,
  detectRepeatedPairings,
} from './AssignmentPage';
import {
  ApplicationSummaryDto,
  RecruiterSummaryDto,
} from '../api/dtos/assignment.dto';
import { ApplicationRound } from '../api/dtos/enums';

describe('AssignmentPage utilities', () => {
  describe('comb', () => {
    it('computes C(n, r) correctly', () => {
      expect(comb(5, 2)).toBe(10);
      expect(comb(5, 3)).toBe(10);
      expect(comb(4, 2)).toBe(6);
      expect(comb(3, 1)).toBe(3);
      expect(comb(5, 0)).toBe(1);
      expect(comb(5, 5)).toBe(1);
    });

    it('returns 0 for invalid inputs', () => {
      expect(comb(5, 6)).toBe(0);
      expect(comb(3, -1)).toBe(0);
    });
  });

  describe('combinations', () => {
    it('generates all r-combinations', () => {
      const arr = [1, 2, 3];
      const combos = Array.from(combinations(arr, 2));
      expect(combos).toEqual([
        [1, 2],
        [1, 3],
        [2, 3],
      ]);
    });

    it('handles edge cases', () => {
      expect(Array.from(combinations([1, 2], 0))).toEqual([[]]);
      expect(Array.from(combinations([1], 1))).toEqual([[1]]);
      expect(Array.from(combinations([], 0))).toEqual([[]]);
    });
  });

  describe('computePreview', () => {
    const mockApps = (count: number): ApplicationSummaryDto[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: 10 + i,
        round: ApplicationRound.SCREENING,
        roundStatus: 'PENDING',
        applicant: { name: `Applicant ${i + 1}` },
      }));
    };

    const mockRecruiters = (count: number): RecruiterSummaryDto[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: 1 + i,
        firstName: `Recruiter${i + 1}`,
        lastName: 'Test',
      }));
    };

    it('returns one row per app with correct appId and appName', () => {
      const apps = mockApps(3);
      const recruiters = mockRecruiters(2);

      const result = computePreview(apps, recruiters, 1);

      expect(result).toHaveLength(3);
      result.forEach((row, i) => {
        expect(row.appId).toBe(10 + i);
        expect(row.appName).toBe(`Applicant ${i + 1}`);
      });
    });

    it('with perApp=1 uses simple round-robin (no pairing logic)', () => {
      const apps = mockApps(3);
      const recruiters = mockRecruiters(2);

      const result = computePreview(apps, recruiters, 1);

      expect(result[0].recruiterSlots).toEqual([1]);
      expect(result[1].recruiterSlots).toEqual([2]);
      expect(result[2].recruiterSlots).toEqual([1]);
    });

    it('with perApp=2 and enough recruiters produces valid slots', () => {
      const apps = mockApps(2);
      const recruiters = mockRecruiters(3);

      const result = computePreview(apps, recruiters, 2);

      result.forEach((row) => {
        expect(row.recruiterSlots).toHaveLength(2);
        // All IDs should be in recruiter list
        row.recruiterSlots.forEach((id) => {
          expect([1, 2, 3]).toContain(id);
        });
        // No duplicates within a row
        expect(new Set(row.recruiterSlots).size).toBe(2);
      });
    });

    it('with perApp=2 and too few recruiters falls back to round-robin', () => {
      const apps = mockApps(2);
      const recruiters = mockRecruiters(2);

      const result = computePreview(apps, recruiters, 2);

      // With 2 recruiters and perApp=2, C(2,2)=1 which is ≤ 10000
      // So it should use exhaustive search (not round-robin)
      expect(result).toHaveLength(2);
      result.forEach((row) => {
        expect(row.recruiterSlots).toHaveLength(2);
      });
    });

    it('falls back to round-robin when C(K, perApp) > 10000', () => {
      // C(100, 5) is a huge number, so should fall back
      const apps = mockApps(5);
      const recruiters = Array.from({ length: 100 }, (_, i) => ({
        id: 1 + i,
        firstName: `Recruiter${i + 1}`,
        lastName: 'Test',
      }));

      const result = computePreview(apps, recruiters, 5);

      expect(result).toHaveLength(5);
      result.forEach((row) => {
        expect(row.recruiterSlots).toHaveLength(5);
      });
    });

    it('produces valid slots all from selected recruiters', () => {
      const apps = mockApps(4);
      const recruiters = mockRecruiters(4);

      const result = computePreview(apps, recruiters, 2);
      const recruiterIds = new Set([1, 2, 3, 4]);

      result.forEach((row) => {
        row.recruiterSlots.forEach((id) => {
          expect(recruiterIds.has(id)).toBe(true);
        });
      });
    });
  });

  describe('detectRepeatedPairings', () => {
    const mockRecruiterMap = (count: number) => {
      const map = new Map<number, string>();
      for (let i = 0; i < count; i++) {
        map.set(i + 1, `Recruiter${i + 1}`);
      }
      return map;
    };

    it('returns empty array when no pair appears more than once', () => {
      const rows = [
        {
          appId: 10,
          appName: 'App 1',
          recruiterSlots: [1, 2],
        },
        {
          appId: 11,
          appName: 'App 2',
          recruiterSlots: [3, 4],
        },
      ];
      const recruiterMap = mockRecruiterMap(4);

      const result = detectRepeatedPairings(rows, recruiterMap);

      expect(result).toEqual([]);
    });

    it('returns pair names when two rows share the same two recruiters', () => {
      const rows = [
        {
          appId: 10,
          appName: 'App 1',
          recruiterSlots: [1, 2],
        },
        {
          appId: 11,
          appName: 'App 2',
          recruiterSlots: [1, 2],
        },
      ];
      const recruiterMap = mockRecruiterMap(2);

      const result = detectRepeatedPairings(rows, recruiterMap);

      expect(result).toContain('Recruiter1 & Recruiter2');
    });

    it('handles pairs in different orders correctly', () => {
      const rows = [
        {
          appId: 10,
          appName: 'App 1',
          recruiterSlots: [1, 2],
        },
        {
          appId: 11,
          appName: 'App 2',
          recruiterSlots: [2, 1], // Different order, same pair
        },
      ];
      const recruiterMap = mockRecruiterMap(2);

      const result = detectRepeatedPairings(rows, recruiterMap);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/Recruiter[12] & Recruiter[12]/);
    });

    it('works correctly with perApp=1 (no pairs → always empty)', () => {
      const rows = [
        {
          appId: 10,
          appName: 'App 1',
          recruiterSlots: [1],
        },
        {
          appId: 11,
          appName: 'App 2',
          recruiterSlots: [1],
        },
      ];
      const recruiterMap = mockRecruiterMap(1);

      const result = detectRepeatedPairings(rows, recruiterMap);

      expect(result).toEqual([]);
    });

    it('detects multiple different repeated pairs', () => {
      const rows = [
        {
          appId: 10,
          appName: 'App 1',
          recruiterSlots: [1, 2],
        },
        {
          appId: 11,
          appName: 'App 2',
          recruiterSlots: [1, 2],
        },
        {
          appId: 12,
          appName: 'App 3',
          recruiterSlots: [3, 4],
        },
        {
          appId: 13,
          appName: 'App 4',
          recruiterSlots: [3, 4],
        },
      ];
      const recruiterMap = mockRecruiterMap(4);

      const result = detectRepeatedPairings(rows, recruiterMap);

      expect(result).toHaveLength(2);
    });
  });
});
