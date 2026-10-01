import type { AssessmentItem } from '../../../types';
import { M1_APTITUDE_ITEMS } from './m1_aptitude';
import { M2_DSA_ITEMS } from './m2_dsa';
import { M3_PYTHON_ITEMS } from './m3_python';
import { M4_SQL_ITEMS } from './m4_sql';
import { M5_DBMS_ITEMS } from './m5_dbms';
import { M6_OOP_ITEMS } from './m6_oop';
import { M7_OS_ITEMS } from './m7_os';
import { M8_CN_ITEMS } from './m8_cn';
import { M9_COMMUNICATION_ITEMS } from './m9_communication';
import { M10_INTERVIEWS_ITEMS } from './m10_interviews';

export {
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
 * Authoritative set of all 84 baseline diagnostic assessment items.
 * Guaranteed deterministic order following module sequence M1 through M10.
 */
export const BASELINE_ASSESSMENT_ITEMS: AssessmentItem[] = [
  ...M1_APTITUDE_ITEMS,
  ...M2_DSA_ITEMS,
  ...M3_PYTHON_ITEMS,
  ...M4_SQL_ITEMS,
  ...M5_DBMS_ITEMS,
  ...M6_OOP_ITEMS,
  ...M7_OS_ITEMS,
  ...M8_CN_ITEMS,
  ...M9_COMMUNICATION_ITEMS,
  ...M10_INTERVIEWS_ITEMS,
];
