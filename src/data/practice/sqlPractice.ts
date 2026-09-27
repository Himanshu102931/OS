import { makeSession } from './bank';

/**
 * Phase 2B — SQL question bank (topic `prep-sql`).
 * Sessions are appended after `practice-sql-01` so every existing lookup that uses
 * `find(category === 'sql')` still resolves to the original session.
 */

export const SQL_SESSIONS = [
  makeSession({
    id: 'practice-sql-02',
    title: 'SQL Fundamentals: Filtering, Joins & Aggregates',
    description: 'Clause evaluation order, NULL semantics, join types, aggregate behaviour, and write-the-query drills.',
    category: 'sql',
    domainId: 'sql',
    topicId: 'prep-sql',
    minutes: 20,
    passing: 70,
    questions: [
      {
        id: 'q-sql2-01',
        tag: 'Clause Order',
        prompt: 'Which clause filters rows AFTER grouping has been applied?',
        options: ['WHERE', 'HAVING', 'ON', 'QUALIFY'],
        answer: 1,
        explanation:
          'WHERE filters individual rows before grouping; HAVING filters the groups produced by GROUP BY. QUALIFY exists only in some dialects.',
        hint: 'Think about which stage the filter runs at.',
      },
      {
        id: 'q-sql2-02',
        tag: 'Aggregates',
        prompt: 'Table `users` has 10 rows and 3 rows with NULL email. What does `SELECT COUNT(email) FROM users` return?',
        options: ['10', '7', '3', 'NULL'],
        answer: 1,
        explanation: 'COUNT(column) counts non-NULL values only, so 10 - 3 = 7. COUNT(*) would return 10.',
        hint: 'COUNT(*) and COUNT(column) differ on NULLs.',
      },
      {
        id: 'q-sql2-03',
        tag: 'Joins',
        prompt: 'A LEFT JOIN of orders to customers keeps which rows?',
        options: [
          'Only orders that have a matching customer',
          'All orders, with NULLs filled in where no customer matched',
          'All customers, with NULLs filled in where no order matched',
          'Only rows where both sides match',
        ],
        answer: 1,
        explanation:
          'LEFT JOIN preserves every row of the left table (orders) and emits NULL for unmatched right-side columns.',
        hint: 'The left table is the one written first.',
      },
      {
        id: 'q-sql2-04',
        tag: 'Sorting',
        prompt: 'If `ORDER BY salary` is written without a direction, rows come back:',
        options: ['Descending, NULLs first', 'Ascending, NULLs last', 'Random order', 'Grouped by primary key'],
        answer: 1,
        explanation: 'ASC is the default and standard SQL places NULLs last in ascending order (smaller than every value).',
        hint: 'ASC is the default keyword.',
      },
      {
        id: 'q-sql2-05',
        tag: 'NULL Handling',
        prompt: 'Why does `WHERE manager_id = NULL` never return rows?',
        options: [
          'It raises a syntax error',
          'NULL = NULL evaluates to UNKNOWN, not TRUE, so the row is filtered out',
          'NULL is stored as an empty string',
          'It returns every row instead',
        ],
        answer: 1,
        explanation: 'Any comparison with NULL yields UNKNOWN, and WHERE only keeps rows that evaluate to TRUE. Use `IS NULL`.',
        hint: 'Three-valued logic: TRUE / FALSE / UNKNOWN.',
      },
      {
        id: 'q-sql2-06',
        tag: 'Self Join',
        type: 'sql_scenario',
        prompt: 'Table `emp(id, name, manager_id)`. Write a query returning each employee alongside their manager name.',
        explanation:
          'SELECT e.name AS employee, m.name AS manager FROM emp e JOIN emp m ON e.manager_id = m.id;',
        hint: 'Alias the same table twice: one alias for employees, one for managers.',
      },
      {
        id: 'q-sql2-07',
        tag: 'Anti Join',
        type: 'sql_scenario',
        prompt: 'Find departments that currently have no employees assigned. Tables: `departments(id, name)`, `employees(id, dept_id)`.',
        explanation:
          'SELECT d.name FROM departments d LEFT JOIN employees e ON e.dept_id = d.id WHERE e.id IS NULL;',
        hint: 'Keep every department, then keep only the rows where no employee matched.',
      },
      {
        id: 'q-sql2-08',
        tag: 'Set Operations',
        prompt: 'What is the difference between UNION and UNION ALL?',
        options: [
          'UNION removes duplicate rows; UNION ALL keeps them and skips the sort step',
          'UNION ALL removes duplicates; UNION keeps them',
          'They are identical in every engine',
          'UNION works only on tables with identical column names',
        ],
        answer: 0,
        explanation:
          'UNION performs a duplicate-eliminating sort/hash; UNION ALL simply concatenates, which is faster when duplicates are impossible or acceptable.',
        hint: 'One of them has to compare rows to remove duplicates.',
      },
      {
        id: 'q-sql2-09',
        tag: 'Ranking',
        type: 'sql_scenario',
        prompt: 'Tables `products(id, name, category_id, price)` and `sales(product_id, qty)`. Return the top 3 products by revenue within each category.',
        explanation:
          'WITH revenue AS (SELECT p.category_id, p.id, p.name, SUM(s.qty * p.price) AS rev FROM products p JOIN sales s ON s.product_id = p.id GROUP BY p.category_id, p.id, p.name) SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY rev DESC) AS rn FROM revenue) t WHERE rn <= 3;',
        hint: 'Aggregate first, then rank with ROW_NUMBER() partitioned by category.',
      },
    ],
  }),

  makeSession({
    id: 'practice-sql-03',
    title: 'SQL Advanced: Subqueries, Windows & Indexes',
    description: 'Execution order, correlated subqueries, ranking with ties, duplicate detection, and indexing effects.',
    category: 'sql',
    domainId: 'sql',
    topicId: 'prep-sql',
    minutes: 22,
    passing: 70,
    questions: [
      {
        id: 'q-sql2-10',
        tag: 'Aggregates',
        prompt: 'Column `bonus` has values 10, 20, NULL. What does `AVG(bonus)` return?',
        options: ['10', '15', '20', 'NULL'],
        answer: 1,
        explanation: 'AVG ignores NULLs: (10 + 20) / 2 = 15. Only COUNT(*) treats NULL rows as countable.',
        hint: 'NULLs are skipped in both the sum and the divisor.',
      },
      {
        id: 'q-sql2-11',
        tag: 'Indexing',
        prompt: 'What is the main cost of adding an index on a frequently updated column?',
        options: [
          'SELECT statements become slower',
          'Every INSERT/UPDATE/DELETE must also maintain the index',
          'The table can no longer be joined',
          'NULLs become disallowed in that column',
        ],
        answer: 1,
        explanation:
          'Indexes speed up reads but add write amplification: the B+ tree must be rebalanced on every modification of the indexed key.',
        hint: 'Think about who pays when data changes.',
      },
      {
        id: 'q-sql2-12',
        tag: 'Subqueries',
        prompt: 'What makes a subquery "correlated"?',
        options: [
          'It uses JOIN instead of SELECT',
          'It references columns from the outer query and is re-evaluated per outer row',
          'It returns more than one row',
          'It appears before the main SELECT in the statement',
        ],
        answer: 1,
        explanation:
          'A correlated subquery depends on outer-query values, so the planner cannot run it once and cache the result — that is why EXISTS often plans better.',
        hint: 'Look for a reference to an outer alias inside the inner query.',
      },
      {
        id: 'q-sql2-13',
        tag: 'Anti Join',
        type: 'sql_scenario',
        prompt: 'Table `products(id, name)` and `order_items(product_id)`. Return products that have never been ordered.',
        explanation:
          'SELECT p.name FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);',
        hint: 'NOT EXISTS stops at the first match, so it usually beats NOT IN with NULLs around.',
      },
      {
        id: 'q-sql2-14',
        tag: 'Execution Order',
        prompt: 'In which order does the logical query processor evaluate these clauses?',
        options: [
          'SELECT → WHERE → GROUP BY → HAVING → ORDER BY',
          'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY',
          'FROM → SELECT → WHERE → GROUP BY → ORDER BY',
          'WHERE → FROM → GROUP BY → SELECT → HAVING',
        ],
        answer: 1,
        explanation:
          'FROM builds the row source, WHERE filters rows, GROUP BY aggregates, HAVING filters groups, SELECT projects columns, and ORDER BY sorts last.',
        hint: 'You cannot filter on an alias in WHERE because SELECT has not run yet.',
      },
      {
        id: 'q-sql2-15',
        tag: 'Duplicates',
        type: 'sql_scenario',
        prompt: 'Table `users(id, email)`. Write a query listing every email that appears more than once.',
        explanation:
          'SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1;',
        hint: 'Group by the value, then keep groups with a count above 1.',
      },
      {
        id: 'q-sql2-16',
        tag: 'Ranking',
        prompt: 'Three employees tie on salary for rank 1. What does DENSE_RANK() assign the next distinct salary?',
        options: ['2', '3', '4', 'It repeats 1'],
        answer: 0,
        explanation:
          'DENSE_RANK() leaves no gaps: tied rows share 1 and the next distinct value gets 2. RANK() would jump to 4 for the next distinct salary.',
        hint: 'Compare "no gaps" versus "gaps after ties".',
      },
      {
        id: 'q-sql2-17',
        tag: 'Top-N',
        type: 'sql_scenario',
        prompt: 'Table `employees(id, name, salary)`. Write a query returning the employee with the single highest salary.',
        explanation:
          'SELECT name FROM employees ORDER BY salary DESC LIMIT 1;  -- or: WHERE salary = (SELECT MAX(salary) FROM employees)',
        hint: 'Either sort and take the first row, or compare against MAX(salary).',
      },
      {
        id: 'q-sql2-18',
        tag: 'Expressions',
        prompt: 'Which clause assigns a label such as `status_band` and then sorts by it?',
        options: [
          'SELECT CASE WHEN ... END AS status_band ... ORDER BY status_band',
          'WHERE status_band = CASE ...',
          'HAVING status_band',
          'GROUP BY status_band only',
        ],
        answer: 0,
        explanation:
          'The SELECT list computes the expression, ORDER BY may then reference the alias (unlike WHERE, which runs before SELECT).',
        hint: 'ORDER BY is the only clause allowed to reuse a select-list alias.',
      },
    ],
  }),
];
