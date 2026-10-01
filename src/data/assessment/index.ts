import type { DomainId } from '../../types';
import type { AssessmentItem } from '../../types';
import {
  BASELINE_ASSESSMENT_DEFINITION,
  SUNDAY_MINI_TEST_DEFINITION,
  ASSESSMENT_DEFINITIONS,
} from './definitions';
import {
  BASELINE_ASSESSMENT_ITEMS,
  M1_APTITUDE_ITEMS,
  M2_DSA_ITEMS,
  M3_PYTHON_ITEMS,
  M4_SQL_ITEMS,
  M5_DBMS_ITEMS,
  M6_OOP_ITEMS,
  M7_OS_ITEMS,
  M8_CN_ITEMS,
  M9_COMMUNICATION_ITEMS,
  M10_INTERVIEWS_ITEMS,
} from './items';

export {
  BASELINE_ASSESSMENT_DEFINITION,
  SUNDAY_MINI_TEST_DEFINITION,
  ASSESSMENT_DEFINITIONS,
  BASELINE_ASSESSMENT_ITEMS,
  M1_APTITUDE_ITEMS,
  M2_DSA_ITEMS,
  M3_PYTHON_ITEMS,
  M4_SQL_ITEMS,
  M5_DBMS_ITEMS,
  M6_OOP_ITEMS,
  M7_OS_ITEMS,
  M8_CN_ITEMS,
  M9_COMMUNICATION_ITEMS,
  M10_INTERVIEWS_ITEMS,
};

/**
 * Returns all baseline assessment items for a given domain.
 */
export function getBaselineItemsByDomain(domainId: DomainId): AssessmentItem[] {
  return BASELINE_ASSESSMENT_ITEMS.filter((item) => item.domainId === domainId);
}

/**
 * Finds a specific baseline assessment item by ID.
 */
export function getAssessmentItemById(itemId: string): AssessmentItem | undefined {
  return BASELINE_ASSESSMENT_ITEMS.find((item) => item.id === itemId);
}
