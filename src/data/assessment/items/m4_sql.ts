import type { AssessmentItem } from '../../../types';

/**
 * M4: SQL Query Reasoning
 * 7 items, 15 minutes budget
 * Difficulty: 2 easy (diff 1-2), 3 medium (diff 3), 2 hard (diff 4)
 * Formats: MCQ, code trace, short written query (sql_query with acceptableForms)
 */
export const M4_SQL_ITEMS: AssessmentItem[] = [
  // --- Easy Items (2 items: 1 diff 1, 1 diff 2) ---
  {
    id: 'asm-sql-001',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-select-filter',
    difficulty: 1,
    estimatedMinutes: 2,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Given table `Employees (id, name, department, salary)`:\nWhat is the exact processing behavior of this query?\n```sql\nSELECT department, AVG(salary)\nFROM Employees\nWHERE salary > 50000\nGROUP BY department\nHAVING COUNT(*) >= 3;\n```',
    options: [
      'Filters rows with salary > 50000 first, groups by department, and keeps only departments with at least 3 qualifying employees',
      'Calculates the average salary of all employees, then removes departments with fewer than 3 total employees',
      'Throws a syntax error because WHERE cannot be placed before GROUP BY in SQL',
      'Calculates departmental averages first, then filters individual salaries below 50000'
    ],
    key: 0,
    explanation: 'Logical SQL evaluation order executes FROM -> WHERE -> GROUP BY -> HAVING -> SELECT. The WHERE clause filters out rows with salary <= 50000 before aggregation. HAVING COUNT(*) >= 3 then restricts groups to those with at least 3 qualifying rows.',
    errorCategories: ['E-CONCEPT', 'sql-select-filter'],
    origin: 'assessment',
  },
  {
    id: 'asm-sql-002',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-null-semantics',
    difficulty: 2,
    estimatedMinutes: 2,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Given table `Customers (id, name, referral_id)` where `referral_id` contains integer values and NULLs:\nWhat does `SELECT COUNT(*) FROM Customers WHERE referral_id != 2;` return?',
    options: [
      'Counts rows where referral_id is not 2, strictly excluding rows where referral_id IS NULL',
      'Counts all rows except where referral_id equals 2, including rows where referral_id IS NULL',
      'Raises a syntax error because != is not recognized in standard SQL',
      'Always returns 0 if any row in the table contains a NULL value'
    ],
    key: 0,
    explanation: 'In SQL three-valued logic (TRUE, FALSE, UNKNOWN), comparing any value to NULL using != evaluates to UNKNOWN. The WHERE clause only accepts rows where the predicate is TRUE, thereby excluding all rows where referral_id IS NULL.',
    errorCategories: ['E-CONCEPT', 'sql-null-semantics'],
    origin: 'assessment',
  },

  // --- Medium Items (3 items: diff 3) ---
  {
    id: 'asm-sql-003',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-join',
    difficulty: 3,
    estimatedMinutes: 2,
    questionType: 'mcq',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Table A contains 4 rows with IDs: [1, 1, 2, NULL]. Table B contains 3 rows with IDs: [1, 2, 2]. How many rows are returned by `SELECT * FROM A INNER JOIN B ON A.id = B.id`?',
    options: ['3 rows', '4 rows', '5 rows', '6 rows'],
    key: 1,
    explanation: 'Matching on ID 1 produces 2 × 1 = 2 rows. Matching on ID 2 produces 1 × 2 = 2 rows. NULL = NULL evaluates to UNKNOWN and produces 0 rows. Total rows = 2 + 2 = 4.',
    errorCategories: ['E-APPLY', 'sql-join'],
    origin: 'assessment',
  },
  {
    id: 'asm-sql-004',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-window-functions',
    difficulty: 3,
    estimatedMinutes: 2,
    questionType: 'code_trace',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Table `Scores (student_id, score)` has rows: (1, 90), (2, 90), (3, 80), (4, 70).\nWhat dense rank values are assigned to students 1, 2, 3, and 4 respectively by `DENSE_RANK() OVER (ORDER BY score DESC)`?',
    options: [
      '1, 1, 2, 3',
      '1, 1, 3, 4',
      '1, 2, 3, 4',
      '1, 1, 2, 2'
    ],
    key: 0,
    explanation: 'DENSE_RANK() assigns consecutive rank numbers without skipping numbers after ties. Students 1 and 2 tie at rank 1, student 3 receives rank 2, and student 4 receives rank 3.',
    errorCategories: ['E-CONCEPT', 'sql-window-functions'],
    origin: 'assessment',
  },
  {
    id: 'asm-sql-005',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-group-by',
    difficulty: 3,
    estimatedMinutes: 2,
    questionType: 'sql_query',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: {
      kind: 'normalized_match',
      weight: 1,
      acceptableForms: [
        'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;',
        'SELECT department_id, COUNT(*) AS emp_count FROM employees GROUP BY department_id;',
        'SELECT department_id, COUNT(id) FROM employees GROUP BY department_id;',
        'SELECT department_id, COUNT(1) FROM employees GROUP BY department_id;'
      ],
    },
    prompt: 'Write a SQL query to return the `department_id` and the total number of employees in each department from table `employees`.\nGroup the results by `department_id`.',
    options: [
      'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;',
      'SELECT department_id, SUM(id) FROM employees GROUP BY department_id;',
      'SELECT department_id, COUNT(*) FROM employees WHERE department_id IS NOT NULL;',
      'SELECT DISTINCT department_id, COUNT(*) OVER() FROM employees;'
    ],
    key: 0,
    explanation: 'The query aggregates employees grouped by department_id using COUNT(*): `SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;`',
    errorCategories: ['E-APPLY', 'sql-group-by'],
    origin: 'assessment',
  },

  // --- Hard Items (2 items: diff 4) ---
  {
    id: 'asm-sql-006',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-join',
    difficulty: 4,
    estimatedMinutes: 2.5,
    questionType: 'sql_query',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: {
      kind: 'normalized_match',
      weight: 1,
      acceptableForms: [
        'SELECT c.name FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.customer_id IS NULL;',
        'SELECT c.name FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL;',
        'SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);',
        'SELECT c.name FROM customers AS c LEFT OUTER JOIN orders AS o ON c.id = o.customer_id WHERE o.customer_id IS NULL;'
      ],
    },
    prompt: 'Given tables `customers (id, name)` and `orders (id, customer_id, order_date)`:\nWrite a query using a LEFT JOIN to select the names of all customers who have never placed an order.',
    options: [
      'SELECT c.name FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL;',
      'SELECT c.name FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL;',
      'SELECT c.name FROM customers c RIGHT JOIN orders o ON c.id = o.customer_id WHERE c.id IS NULL;',
      'SELECT c.name FROM customers c FULL JOIN orders o ON c.id = o.customer_id;'
    ],
    key: 0,
    explanation: 'A LEFT JOIN retains all customers. Non-ordering customers produce NULL in all orders columns. Filtering `WHERE o.id IS NULL` (or `o.customer_id IS NULL`) isolates customers with 0 orders.',
    errorCategories: ['E-PATTERN', 'sql-join'],
    origin: 'assessment',
  },
  {
    id: 'asm-sql-007',
    domainId: 'sql',
    topicId: 'prep-sql',
    competency: 'sql-subquery',
    difficulty: 4,
    estimatedMinutes: 2.5,
    questionType: 'mcq',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Table `Employee (id, salary)` contains employee salary records. Which of the following queries reliably returns the second highest distinct salary, or NULL if fewer than two distinct salaries exist?',
    options: [
      'SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee);',
      'SELECT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET 1;',
      'SELECT MIN(salary) FROM (SELECT salary FROM Employee ORDER BY salary DESC LIMIT 2);',
      'SELECT salary FROM Employee WHERE salary = (SELECT MAX(salary) - 1 FROM Employee);'
    ],
    key: 0,
    explanation: '`SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee)` finds the maximum salary strictly lower than the overall maximum. If all employees have the same salary or the table has 1 row, MAX() returns NULL without errors. `LIMIT 1 OFFSET 1` fails on ties.',
    errorCategories: ['E-APPLY', 'sql-subquery'],
    origin: 'assessment',
  },
];
