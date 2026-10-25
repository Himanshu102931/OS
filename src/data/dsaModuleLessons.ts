/**
 * PlacementOS — 8-Day DSA Challenge Interactive Module Lessons
 *
 * Authored to match the pedagogical standard and instructional depth of:
 * - DSA_Day_1_Complete_Trainer_Deck.pptx (23 slides — Logic Building, Complexity, Arrays)
 * - DSA DAY-2.pptx (34 slides — Hashing & Prefix Sums)
 * - Students8_Day_Placement_Preparation_Plan.pdf (Authoritative 8-Day Curriculum)
 *
 * Each module delivers:
 * A. Starting Knowledge Check (3–5 concept questions with instant beginner feedback, zero penalty)
 * B. Core Concepts (plain-language definitions, visual mental models, code templates, time/space trade-offs)
 * C. Pattern Recognition Guide (problem cues, preconditions, anti-patterns, comparison matrices)
 * D. Warm-up & Prerequisites (e.g., #1480 Running Sum & #217 Contains Duplicate for Day 1)
 * E. Exit Check (summative pattern quiz with targeted revision advice)
 */

export interface LessonQuestion {
  readonly id: string;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly topicHint: string;
}

export interface LessonConcept {
  readonly title: string;
  readonly plainLanguageDefinition: string;
  readonly whyItMatters: string;
  readonly visualRepresentation?: string;
  readonly codeTemplate?: string;
  readonly complexityAnalysis: {
    readonly time: string;
    readonly space: string;
    readonly explanation: string;
  };
}

export interface PatternComparisonItem {
  readonly problemOrQuery: string;
  readonly recommendedPattern: string;
  readonly why: string;
}

export interface ModuleLessonData {
  readonly day: number;
  readonly title: string;
  readonly learningOutcomes: readonly string[];
  readonly estimatedMinutes: number;
  readonly startingKnowledgeCheck: readonly LessonQuestion[];
  readonly coreConcepts: readonly LessonConcept[];
  readonly patternGuide: {
    readonly howToIdentify: readonly string[];
    readonly preconditions: readonly string[];
    readonly whenNotToUse: readonly string[];
    readonly comparisonMatrix: readonly PatternComparisonItem[];
  };
  readonly warmUpProblems?: readonly {
    readonly leetcodeNumber: number;
    readonly title: string;
    readonly skill: string;
    readonly note: string;
    readonly leetcodeUrl: string;
  }[];
  readonly exitCheck: readonly LessonQuestion[];
}

export const DSA_MODULE_LESSONS: Record<number, ModuleLessonData> = {
  // =========================================================================
  // DAY 1: Logic Building, Complexity & Arrays (Trainer Deck Standard)
  // =========================================================================
  1: {
    day: 1,
    title: 'Logic Building, Complexity & Arrays',
    estimatedMinutes: 35,
    learningOutcomes: [
      'Explain Big-O as an asymptotic growth model rather than wall-clock execution time.',
      'Estimate loop iterations in single, nested, and halving loops accurately.',
      'Distinguish consecutive loops (O(n) + O(n) = O(n)) from nested loops (O(n × n) = O(n²)).',
      'Differentiate algorithm time complexity from auxiliary workspace memory.',
      'Traverse, search, and update 0-indexed arrays safely without off-by-one errors.',
      'Apply an 8-point edge case checklist to all submissions before writing code.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd1-pre-1',
        question: 'What is printed by the loop: for i in range(4): print(i)?',
        options: ['1 2 3 4', '0 1 2 3', '0 1 2 3 4', '1 2 3'],
        correctIndex: 1,
        explanation: 'In Python and standard 0-indexed languages, range(4) starts at 0 and stops strictly before 4, producing the indices 0, 1, 2, 3.',
        topicHint: '0-Indexed Loops & Traversal',
      },
      {
        id: 'd1-pre-2',
        question: 'In an array of length n, what is the last valid 0-based index?',
        options: ['n', 'n - 1', 'n + 1', '1'],
        correctIndex: 1,
        explanation: 'Because array indexing starts at 0, the first element is at index 0 and the n-th element is at index n - 1. Attempting to access index n raises an IndexError / Out-of-Bounds exception.',
        topicHint: 'Array Index Boundaries',
      },
      {
        id: 'd1-pre-3',
        question: 'How many times does the innermost statement execute in two nested loops, each iterating n times?',
        options: ['2n', 'n + n', 'n²', 'log n'],
        correctIndex: 2,
        explanation: 'For each of the n iterations of the outer loop, the inner loop executes n times. Thus, the total iterations are n × n = n² (Quadratic time).',
        topicHint: 'Loop Complexity Estimation',
      },
      {
        id: 'd1-pre-4',
        question: 'What is the fundamental difference between consecutive loops vs nested loops?',
        options: [
          'Consecutive loops multiply iterations (n × n); nested loops add them (n + n).',
          'Consecutive loops add work: O(n) + O(n) = O(n); nested loops multiply work: O(n × n) = O(n²).',
          'Both have identical O(n²) time complexity.',
          'Consecutive loops require O(n) extra memory while nested loops do not.',
        ],
        correctIndex: 1,
        explanation: 'Loops executed in sequence add their runtimes: O(n) + O(n) = O(2n) = O(n). Only when one loop is placed inside another do the iterations multiply to O(n²).',
        topicHint: 'Loop Addition vs Multiplication',
      },
      {
        id: 'd1-pre-5',
        question: 'How would you find the maximum value in an array of size n in a single pass?',
        options: [
          'Sort the array first in O(n log n) and return the last element.',
          'Initialize max_val with the first element, iterate through the remaining elements, and update max_val whenever a larger element is found.',
          'Compare every element with every other element using two nested loops.',
          'Initialize max_val to 0, which works safely even when all array values are negative.',
        ],
        correctIndex: 1,
        explanation: 'A one-pass scan initializes max_val to nums[0] (or -infinity) and compares each element once. This takes O(n) time and O(1) auxiliary space without modifying the array.',
        topicHint: 'Accumulator Traversal Pattern',
      },
    ],
    coreConcepts: [
      {
        title: 'Big-O Asymptotic Complexity Mental Model',
        plainLanguageDefinition:
          'Big-O notation describes how an algorithm\'s resource consumption (time or memory) scales as the input size n grows toward infinity. It measures growth rate, not physical seconds on a specific machine.',
        whyItMatters:
          'A computer running an O(n²) algorithm on n = 100,000 takes ~10¹⁰ operations (~100 seconds, resulting in Time Limit Exceeded). An O(n) algorithm takes 100,000 operations (~0.001 seconds). Big-O predicts whether code will pass interview platform time limits.',
        visualRepresentation: `
Growth Comparison Table:
-------------------------------------------------------------------------------------
Notation   | Name         | Example Operations        | 10³ Items     | 10⁶ Items
-------------------------------------------------------------------------------------
O(1)       | Constant     | Read arr[i], hash lookup  | ~1 op         | ~1 op
O(log n)   | Logarithmic  | Binary search in sorted   | ~10 ops       | ~20 ops
O(n)       | Linear       | Single scan, min/max      | 1,000 ops     | 1,000,000 ops
O(n log n) | Linearithmic | Merge sort, Timsort       | ~10,000 ops   | ~20,000,000 ops
O(n²)      | Quadratic    | Nested pair comparison    | 1,000,000 ops | 10¹² ops (TLE!)
O(2ⁿ)      | Exponential  | All subset combinations   | 10³⁰⁰ ops (Astronomical!)
-------------------------------------------------------------------------------------`,
        codeTemplate: `# 1. O(1) Constant Time
def get_first(arr):
    return arr[0] if arr else None

# 2. O(log n) Logarithmic Time (Halving Search Space)
def halving_loop(n):
    steps = 0
    while n > 1:
        n //= 2
        steps += 1
    return steps

# 3. O(n) Linear Time (Single Scan)
def find_max(arr):
    max_val = arr[0]
    for val in arr:
        if val > max_val:
            max_val = val
    return max_val`,
        complexityAnalysis: {
          time: 'Varies from O(1) to O(n²)',
          space: 'O(1) auxiliary space when no extra collections are allocated',
          explanation: 'Algorithms with halving steps achieve logarithmic growth. Algorithms that compare all pairs require quadratic time.',
        },
      },
      {
        title: 'Time Complexity vs Auxiliary Space',
        plainLanguageDefinition:
          'Time complexity measures the number of elementary operations executed. Auxiliary space measures the EXTRA temporary memory allocated by your algorithm, excluding the memory used to store the original input.',
        whyItMatters:
          'Reversing an array by creating a new copy takes O(n) auxiliary space. Reversing it in-place using two pointers takes O(1) auxiliary space. In system design and memory-constrained environments, O(1) auxiliary space is strictly preferred.',
        visualRepresentation: `
In-Place Reversal vs Out-of-Place Copy:
-------------------------------------------------------------------------
Out-of-Place Copy (O(n) Space):
Input:  [10, 20, 30, 40]
Alloc:  [  ,   ,   ,   ] <- New array allocated on heap (O(n) memory)
Copy:   [40, 30, 20, 10]

In-Place Swap (O(1) Auxiliary Space):
Array:  [10,  20,  30,  40]
         ^               ^
        left           right   -> Swap 10 and 40 in-place
Array:  [40,  20,  30,  10]
              ^    ^
            left  right       -> Swap 20 and 30 in-place
Array:  [40,  30,  20,  10]   -> Complete without extra memory allocation!
-------------------------------------------------------------------------`,
        codeTemplate: `def reverse_in_place(arr: list[int]) -> None:
    left = 0
    right = len(arr) - 1
    while left < right:
        # Swap elements at left and right pointers
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1
# Time: O(n) — visits n/2 elements
# Auxiliary Space: O(1) — only two integer pointer variables`,
        complexityAnalysis: {
          time: 'O(n)',
          space: 'O(1)',
          explanation: 'In-place two-pointer traversal updates elements directly within the existing memory buffer.',
        },
      },
      {
        title: 'Array Safe Traversal & The 8-Point Edge Case Checklist',
        plainLanguageDefinition:
          'An array stores a contiguous sequence of elements accessed by index 0 to n - 1. Safe traversal guarantees that every index accessed is valid and that edge cases are anticipated before writing logic.',
        whyItMatters:
          'Over 70% of beginner interview failures occur not from complex algorithms, but from off-by-one errors (accessing arr[n]) or crashing on empty / single-element inputs.',
        visualRepresentation: `
The 8-Point Pre-Submission Edge Case Checklist:
[1] Empty input (len == 0): Does the code crash or handle gracefully?
[2] Single element (len == 1): Does loop terminate without index error?
[3] All elements identical: (e.g. [5, 5, 5]) - Does second-largest find None?
[4] Negative numbers and zeroes: Does max_val = 0 fail on [-5, -2, -9]?
[5] Already sorted or reverse-sorted: Does the algorithm still perform correctly?
[6] Duplicates present: Are duplicate values counted or skipped as intended?
[7] Integer limits: Can values exceed 32-bit signed integer range?
[8] First / Last element targets: Does boundary checking stop correctly at index 0 and n - 1?`,
        codeTemplate: `def find_second_largest_distinct(nums: list[int]) -> int | None:
    # Handles empty and single-element inputs gracefully
    if len(nums) < 2:
        return None

    first = None
    second = None

    for x in nums:
        if first is None or x > first:
            second = first
            first = x
        elif x != first and (second is None or x > second):
            second = x

    # Returns None if all elements are identical (e.g. [5, 5, 5])
    return second`,
        complexityAnalysis: {
          time: 'O(n)',
          space: 'O(1)',
          explanation: 'Single pass maintaining two scalar variables handles negatives, zeroes, and duplicate values accurately.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Problem asks to modify array without allocating extra memory -> Two Pointers (In-place swap or partition).',
        'Problem asks to find maximum/minimum, running accumulator, or frequency -> Single-pass scan with tracking variables.',
        'Problem asks to find two elements meeting a sum/difference condition -> Hash map complement lookup or two pointers if sorted.',
        'Problem asks to shift elements (like move zeroes) -> Read pointer + Write pointer partition.',
      ],
      preconditions: [
        'Array must be indexed in contiguous memory (0 to n - 1).',
        'For two-pointer inward search (e.g. Two Sum II), the input array must be sorted.',
        'For in-place swaps, the collection must be mutable (lists in Python, vectors in C++).',
      ],
      whenNotToUse: [
        'Do not use nested loops O(n²) when n > 1,000 — use a hash map or sorting instead.',
        'Do not assume positive numbers unless constraints explicitly guarantee it (e.g., initializing max to 0 fails for negative numbers).',
        'Do not allocate a new array when the problem specifies "in-place with O(1) extra memory".',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Return the sum of all elements',
          recommendedPattern: 'Single-Pass Traversal Accumulator',
          why: 'O(n) time and O(1) space is optimal; visiting every element once is necessary and sufficient.',
        },
        {
          problemOrQuery: 'Find whether any value appears twice',
          recommendedPattern: 'Hash Set Lookup',
          why: 'Expected O(n) time and O(n) space avoids the O(n²) time of nested loop pairwise comparison.',
        },
        {
          problemOrQuery: 'Reverse array in-place',
          recommendedPattern: 'Two Pointers (Opposite Ends)',
          why: 'Swapping from outside-in achieves O(n) time and O(1) auxiliary space without extra buffer allocation.',
        },
        {
          problemOrQuery: 'Find two values that sum to target',
          recommendedPattern: 'Hash Map Complement Lookup (seen[target - x])',
          why: 'Trading O(n) space allows constant expected lookup time per element, turning O(n²) brute force into O(n).',
        },
        {
          problemOrQuery: 'Move all zeroes to the end in-place',
          recommendedPattern: 'Two Pointers (Read/Write)',
          why: 'Write pointer tracks the insertion point for non-zero elements, preserving relative order in O(n) time and O(1) space.',
        },
      ],
    },
    warmUpProblems: [
      {
        leetcodeNumber: 1480,
        title: 'Running Sum of 1d Array',
        skill: 'Foundational Traversal & Accumulation',
        note: 'Warm-up exercise from Day 1 Trainer Deck: single pass accumulator building running totals.',
        leetcodeUrl: 'https://leetcode.com/problems/running-sum-of-1d-array/',
      },
      {
        leetcodeNumber: 217,
        title: 'Contains Duplicate',
        skill: 'Set Membership & Early Exit',
        note: 'Warm-up exercise from Day 1 Trainer Deck: trading O(n) memory to detect duplicates in O(n) time.',
        leetcodeUrl: 'https://leetcode.com/problems/contains-duplicate/',
      },
    ],
    exitCheck: [
      {
        id: 'd1-exit-1',
        question: 'What is the exact time complexity of scanning an array of size n once to find its smallest element?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correctIndex: 2,
        explanation: 'A single pass must inspect each of the n elements at least once to ensure no smaller value was missed, requiring O(n) linear time.',
        topicHint: 'Linear Scan Complexity',
      },
      {
        id: 'd1-exit-2',
        question: 'What is the auxiliary space complexity of reversing an array in-place using two pointers?',
        options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
        correctIndex: 2,
        explanation: 'In-place two-pointer reversal only requires two integer index variables (left, right) and a temporary swap register. It allocates no memory proportional to n, so auxiliary space is O(1).',
        topicHint: 'Auxiliary Space vs Input Size',
      },
      {
        id: 'd1-exit-3',
        question: 'What is the last valid index of an array containing 12 elements?',
        options: ['12', '11', '10', '0'],
        correctIndex: 1,
        explanation: 'In 0-indexed arrays, indices range from 0 through n - 1. For n = 12, the last valid index is 12 - 1 = 11.',
        topicHint: 'Array Indexing Bounds',
      },
      {
        id: 'd1-exit-4',
        question: 'For LeetCode #1 Two Sum, what trade-off does using a hash map introduce compared to the nested-loop brute force?',
        options: [
          'It reduces time from O(n²) to expected O(n), but increases auxiliary space from O(1) to O(n).',
          'It reduces auxiliary space from O(n) to O(1), but increases time to O(n²).',
          'It requires sorting the input array first.',
          'It only works if all numbers in the array are positive.',
        ],
        correctIndex: 0,
        explanation: 'The hash map trades memory for speed: by storing each seen number and its index in O(n) space, complement lookups take expected O(1) time, slashing overall time from O(n²) to expected O(n).',
        topicHint: 'Time-Space Engineering Trade-Offs',
      },
      {
        id: 'd1-exit-5',
        question: 'Why must we test the input [5, 5, 5] when finding the second-largest distinct element in an array?',
        options: [
          'Because equal elements cause an infinite loop in while loops.',
          'Because if an algorithm does not check for distinctness, it will falsely return 5 as the second-largest value.',
          'Because arrays with identical elements require O(n²) time.',
          'Because Python lists cannot store identical elements.',
        ],
        correctIndex: 1,
        explanation: 'In [5, 5, 5], the largest value is 5, but there IS no distinct second-largest value. A correct algorithm must recognize that every 5 is equal to the maximum and return None (or -1 per problem specification).',
        topicHint: 'Distinct Values & Edge Cases',
      },
      {
        id: 'd1-exit-6',
        question: 'In LeetCode #121 (Best Time to Buy and Sell Stock), why is the decision to sell based on tracking the minimum price SEEN SO FAR rather than the global minimum of the entire array?',
        options: [
          'Because you cannot sell a stock on day i before buying it on or before day i (time moves forward).',
          'Because the global minimum is always at index 0.',
          'Because tracking the global minimum takes O(n²) time.',
          'Because stock prices cannot decrease.',
        ],
        correctIndex: 0,
        explanation: 'Causality constraint: you must buy before you sell. By maintaining the minimum price observed strictly before or on the current day, any profit computed as price[i] - min_price_so_far represents a chronologically valid transaction.',
        topicHint: 'Chronological Invariants',
      },
    ],
  },

  // =========================================================================
  // DAY 2: Hashing & Prefix-Based Reasoning (Trainer Deck Standard)
  // =========================================================================
  2: {
    day: 2,
    title: 'Hashing & Prefix-Based Reasoning',
    estimatedMinutes: 40,
    learningOutcomes: [
      'Understand the hash table mental model: keys, hash function, buckets, and collision resolution.',
      'Recognize that hash lookups are EXPECTED O(1), not a universal worst-case guarantee.',
      'Apply strict selection rules: choose a Set for membership/uniqueness; choose a Map for attached metadata (counts, indices).',
      'Construct prefix sum arrays with a leading zero (P[0] = 0) to eliminate boundary special cases.',
      'Explain why negative values invalidate the standard sliding window technique for target sums.',
      'Solve subarray problems by storing running totals/balances as lookup keys in a hash map.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd2-pre-1',
        question: 'Why does counting character frequencies using a nested loop take O(n²) time on a string of length n?',
        options: [
          'Because string indexing is O(n) in modern programming languages.',
          'Because for each of the n characters, the algorithm scans through earlier or all characters to check or tally counts.',
          'Because strings must be converted to linked lists first.',
          'Because hashing always has quadratic overhead.',
        ],
        correctIndex: 1,
        explanation: 'Without stored state, verifying if character i appeared earlier and counting all its occurrences requires scanning the string for each character, resulting in n × n = O(n²) operations.',
        topicHint: 'Nested Loop Frequency vs Hashing',
      },
      {
        id: 'd2-pre-2',
        question: 'When should you choose a Hash Set instead of a Hash Map?',
        options: [
          'When you need to store frequencies of numbers.',
          'When you need to map each value to its first occurrence index.',
          'When the question only requires binary membership ("Have I seen this value before?") or distinct uniqueness.',
          'When the array contains negative numbers.',
        ],
        correctIndex: 2,
        explanation: 'A Set stores only distinct keys (membership: True/False). When you need associated data (such as frequency counts, earliest indices, or prefix counts), you must use a Map.',
        topicHint: 'Set vs Map Selection Rules',
      },
      {
        id: 'd2-pre-3',
        question: 'What is the primary advantage of defining prefix sums with a leading zero: P[0] = 0 and P[i+1] = P[i] + a[i]?',
        options: [
          'It reduces the array space by half.',
          'It allows any range sum from index l to r to be computed as P[r+1] - P[l] without a special "if l == 0" check.',
          'It automatically sorts the array.',
          'It prevents integer overflow.',
        ],
        correctIndex: 1,
        explanation: 'With P[0] = 0, a range starting at index 0 (e.g. from 0 to 3) is simply P[4] - P[0] = P[4] - 0 = P[4]. The leading zero eliminates branching edge cases for ranges starting at the beginning of the array.',
        topicHint: 'Prefix Sum Leading Zero Convention',
      },
      {
        id: 'd2-pre-4',
        question: 'Why does a standard two-pointer sliding window FAIL to find subarrays summing to k when the array contains negative numbers?',
        options: [
          'Because negative numbers cannot be stored in an array.',
          'Because expanding the window may decrease the sum, and shrinking the window may increase the sum, breaking the monotonic adjustment rule.',
          'Because two pointers only work on strings, not arrays.',
          'Because negative numbers cause hash table collisions.',
        ],
        correctIndex: 1,
        explanation: 'A sliding window relies on monotonicity: expanding the right pointer must increase (or maintain) the sum, while shrinking the left pointer must decrease it. Negative values break this predictability, requiring prefix sums + hash map instead.',
        topicHint: 'Monotonicity & Sliding Window Limits',
      },
    ],
    coreConcepts: [
      {
        title: 'The Hash Table Mental Model: Expected O(1) vs Worst-Case',
        plainLanguageDefinition:
          'A hash table maps keys to array buckets using a hash function. In the average case, operations take O(1) time. However, if many keys hash to the same bucket (collisions), lookup can degrade to O(n) worst-case.',
        whyItMatters:
          'In technical interviews, claiming that hash map operations are "always strictly O(1)" is a red flag. Sophisticated interviewers test whether you know that hash lookups are EXPECTED O(1), and how collision resolution (chaining vs open addressing) functions.',
        visualRepresentation: `
Hash Map Architecture & Collision Handling:
-------------------------------------------------------------------------
Key ("cat")   --> [Hash Function: hash("cat") % 8 = 3] --> Bucket 3: ["cat": 1]
Key ("dog")   --> [Hash Function: hash("dog") % 8 = 5] --> Bucket 5: ["dog": 2]
Key ("act")   --> [Hash Function: hash("act") % 8 = 3] --> Collision at Bucket 3!
                  Bucket 3: ["cat": 1] -> ["act": 1] (Linked chain)

Time Complexity:
- Expected / Average Case: O(1) per insert, search, delete
- Adversarial / Worst Case: O(n) if all n keys collide in a single bucket
-------------------------------------------------------------------------`,
        codeTemplate: `# Frequency counting with Python dict (Hash Map)
def count_frequencies(nums: list[int]) -> dict[int, int]:
    freq: dict[int, int] = {}
    for x in nums:
        freq[x] = freq.get(x, 0) + 1
    return freq`,
        complexityAnalysis: {
          time: 'O(n) expected time to process n elements',
          space: 'O(u) auxiliary space where u is the number of unique elements',
          explanation: 'Each lookup and insertion is expected O(1) amortized.',
        },
      },
      {
        title: 'Prefix Sums Foundation: Transforming Ranges into Differences',
        plainLanguageDefinition:
          'A prefix sum array precomputes cumulative totals such that any range sum query sum(arr[l:r]) can be answered in O(1) time by subtracting two prefix values: P[r] - P[l].',
        whyItMatters:
          'Answering m range sum queries on an array of size n naively takes O(m × n) time. With prefix sums, precomputation takes O(n) time and each subsequent query takes O(1) time, slashing total runtime to O(n + m).',
        visualRepresentation: `
Prefix Sum Array Construction (with P[0] = 0):
-------------------------------------------------------------------------
Original Array a:        [  3,  -2,   5,   1 ]   (length 4)
Indices:                    0    1    2    3
-------------------------------------------------------------------------
Prefix Array P:      [ 0,   3,   1,   6,   7 ]   (length 5)
Prefix Indices:        0    1    2    3    4

Formula: P[i+1] = P[i] + a[i]
Query: Sum of elements from index 1 through 3 (values: -2, 5, 1 = 4)
Formula: sum(a[1:4]) = P[4] - P[1] = 7 - 3 = 4!
Negative numbers are handled seamlessly without extra logic!
-------------------------------------------------------------------------`,
        codeTemplate: `def build_prefix_sums(nums: list[int]) -> list[int]:
    n = len(nums)
    P = [0] * (n + 1)
    for i in range(n):
        P[i + 1] = P[i] + nums[i]
    return P

def query_range(P: list[int], l: int, r: int) -> int:
    # Computes sum of nums[l] through nums[r] inclusive
    return P[r + 1] - P[l]`,
        complexityAnalysis: {
          time: 'Precomputation: O(n); Each range query: O(1)',
          space: 'O(n) auxiliary space to store the prefix array',
          explanation: 'Trades O(n) memory to convert an O(n) interval summation into an O(1) arithmetic difference.',
        },
      },
      {
        title: 'Subarray Sum Equals K: Prefix Sums + Frequency Map',
        plainLanguageDefinition:
          'To find how many continuous subarrays sum to target k, rewrite the prefix identity: P[j] - P[i] = k becomes P[i] = P[j] - k. At each position j, count how many earlier prefixes equal P[j] - k.',
        whyItMatters:
          'This is one of the most frequently asked medium problems at FAANG/Tier-1 companies (LeetCode #560). It seamlessly handles positive, negative, and zero values where sliding window algorithms completely fail.',
        visualRepresentation: `
Mathematical Derivation & State Machine:
-------------------------------------------------------------------------
Subarray sum between index i+1 and j: sum(i+1..j) = P[j] - P[i] = k
Rearranging: P[i] = P[j] - k

Algorithm at each step j:
1. Update running prefix: prefix += nums[j]
2. Query map: total += freq.get(prefix - k, 0)
3. Update map: freq[prefix] = freq.get(prefix, 0) + 1

Crucial Initialization: freq = {0: 1}
Why? Because a prefix sum that equals k itself represents a valid subarray
starting from the very beginning (index 0): prefix - k = k - k = 0!
-------------------------------------------------------------------------`,
        codeTemplate: `def subarray_sum(nums: list[int], k: int) -> int:
    freq = {0: 1} # Base case: empty prefix has sum 0
    prefix = 0
    total = 0

    for x in nums:
        prefix += x
        # 1. Query earlier prefixes before inserting current prefix
        total += freq.get(prefix - k, 0)
        # 2. Record current prefix in frequency map
        freq[prefix] = freq.get(prefix, 0) + 1

    return total`,
        complexityAnalysis: {
          time: 'O(n) expected time — single pass with O(1) hash map operations',
          space: 'O(n) space in worst case when all prefix sums are distinct',
          explanation: 'Optimal time and space; handles negative values and zeros without edge cases.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Problem asks if elements have been seen before or distinct count -> Hash Set (e.g. #349 Intersection).',
        'Problem asks to match characters or anagrams -> Frequency Map / 26-char array (e.g. #242 Valid Anagram).',
        'Problem asks for products/sums excluding an element -> Prefix and Suffix Running Aggregates (e.g. #238 Product Except Self).',
        'Problem asks for number of continuous subarrays with sum k -> Running Prefix + Frequency Map (e.g. #560).',
        'Problem asks for longest contiguous subarray with equal 0s and 1s -> Transformed Prefix Balance + Earliest Index Map (e.g. #525).',
      ],
      preconditions: [
        'Elements or keys must be hashable (immutable strings, integers, tuples).',
        'For prefix sums, addition/multiplication operations must be associative.',
        'Prefix frequency map requires initializing base state {0: 1} for sum-from-start cases.',
      ],
      whenNotToUse: [
        'Do NOT use sliding window when the array contains negative numbers and target sum is sought (use prefix map).',
        'Do NOT use a hash map when a fixed-size 26-element array suffices for lowercase English letters (array is faster, uses less memory, and has no hash collisions).',
        'Do NOT insert the current prefix into the frequency map before querying freq[prefix - k] (ordering prevents counting empty subarrays when k = 0).',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Have I seen value x before?',
          recommendedPattern: 'Hash Set',
          why: 'Binary presence/absence test; no associated count or index needed.',
        },
        {
          problemOrQuery: 'How many times does each character occur?',
          recommendedPattern: 'Hash Map or Fixed Array[26]',
          why: 'Key-value association: character -> integer frequency count.',
        },
        {
          problemOrQuery: 'What is product of all elements except nums[i]?',
          recommendedPattern: 'Prefix & Suffix Running Product',
          why: 'Two linear passes compute left and right products in O(n) time and O(1) extra space without division.',
        },
        {
          problemOrQuery: 'Count contiguous subarrays with sum == k (with negatives)',
          recommendedPattern: 'Running Prefix Sum + Frequency Map',
          why: 'Algebraic prefix identity P[i] = P[j] - k works with negative numbers where sliding window fails.',
        },
        {
          problemOrQuery: 'Longest contiguous subarray with equal 0s and 1s',
          recommendedPattern: 'Balance Map (0 -> -1, 1 -> +1) + Earliest Index',
          why: 'Repeated balance means net zero change; keeping earliest index maximizes subarray length i - earliest.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd2-exit-1',
        question: 'Under what circumstances can a standard hash table lookup degrade from expected O(1) to O(n)?',
        options: [
          'When the array contains floating point numbers.',
          'When all keys hash to the exact same bucket, causing all elements to reside in a single collision chain.',
          'When the table has more than 100 elements.',
          'Hash tables never degrade; they are guaranteed O(1) in all situations.',
        ],
        correctIndex: 1,
        explanation: 'If a poor hash function or adversarial input produces hash collisions for all keys into the same bucket, the table degenerates into a linear linked list where searches take O(n) time.',
        topicHint: 'Hash Collisions & Degraded Performance',
      },
      {
        id: 'd2-exit-2',
        question: 'In LeetCode #560 (Subarray Sum Equals K), why is freq initialized with {0: 1} before the loop begins?',
        options: [
          'To handle 0-indexed arrays.',
          'To account for valid subarrays that start at index 0 whose prefix sum itself equals k (since prefix - k = 0).',
          'To prevent dividing by zero.',
          'It is an arbitrary placeholder that can be omitted.',
        ],
        correctIndex: 1,
        explanation: 'If a prefix sum at index j equals k, then prefix - k = 0. To count the entire subarray from index 0 to j as a valid match, the map must record that a prefix sum of 0 occurred once prior to scanning any elements.',
        topicHint: 'Base State Initialization in Prefix Maps',
      },
      {
        id: 'd2-exit-3',
        question: 'In LeetCode #525 (Contiguous Array), why do we store the EARLIEST index where a balance appeared rather than the latest index?',
        options: [
          'Because the earliest index uses less memory.',
          'Because we want the MAXIMUM length of a balanced subarray, and maximizing (current_index - earlier_index) requires the smallest possible earlier_index.',
          'Because earlier indices are always positive.',
          'Because hash maps cannot overwrite existing keys.',
        ],
        correctIndex: 1,
        explanation: 'Subarray length is current_index - earlier_index. To maximize this length for any repeated balance, we must subtract the smallest (earliest) index where that balance was first seen.',
        topicHint: 'Greedy Maximization with Earliest Index',
      },
      {
        id: 'd2-exit-4',
        question: 'In LeetCode #238 (Product of Array Except Self), why is division prohibited by the problem specification?',
        options: [
          'Because division is too slow on modern CPUs.',
          'Because dividing total product by nums[i] fails when nums contains zeroes and does not demonstrate prefix/suffix decomposition.',
          'Because division converts integers to floating point numbers in Python.',
          'Because division requires O(n) extra memory.',
        ],
        correctIndex: 1,
        explanation: 'Division by zero is undefined. If an array has one zero, all other positions must be non-zero; if it has two zeroes, all positions must be zero. The prefix/suffix product pattern handles zeroes cleanly without branching or division.',
        topicHint: 'Prefix/Suffix Decomposition vs Division',
      },
      {
        id: 'd2-exit-5',
        question: 'Why does sorting both strings in LeetCode #242 (Valid Anagram) take O(n log n) time while frequency counting takes O(n)?',
        options: [
          'Because comparison-based sorting requires Ω(n log n) comparisons, whereas counting characters in a 26-letter alphabet takes a single linear scan.',
          'Because frequency counting requires recursion.',
          'Because sorting requires allocating a new hash map.',
          'Because Python\'s sort method is quadratic.',
        ],
        correctIndex: 0,
        explanation: 'Information-theoretic lower bound for comparison sorting is O(n log n). Frequency counting sidesteps comparisons by tallying character counts directly in a fixed-size table in O(n) time and O(1) space.',
        topicHint: 'Sorting vs Counting Complexity',
      },
    ],
  },

  // =========================================================================
  // DAY 3: Two Pointers & Sliding Window (Official Curriculum Extension)
  // =========================================================================
  3: {
    day: 3,
    title: 'Two Pointers & Sliding Window',
    estimatedMinutes: 35,
    learningOutcomes: [
      'Master opposite-direction pointer convergence on sorted arrays (Two Sum II, 3Sum, Container With Most Water).',
      'Understand same-direction fast/slow pointers for in-place deduplication and partitioning.',
      'Formulate dynamic sliding windows: right pointer expands the window, left pointer contracts to restore invariants.',
      'Prove that sliding window algorithms run in O(n) amortized time because each pointer advances at most n times.',
      'Distinguish fixed-size sliding windows (running delta) from variable-size condition-bounded windows.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd3-pre-1',
        question: 'What is the essential precondition for using opposite-direction two pointers to find two numbers summing to a target?',
        options: [
          'All numbers must be positive.',
          'The input array must be sorted in non-decreasing order.',
          'The array must contain an even number of elements.',
          'The array cannot contain duplicates.',
        ],
        correctIndex: 1,
        explanation: 'In opposite-direction two pointers, if sum < target we increment left (to increase sum), and if sum > target we decrement right (to decrease sum). This monotonic property strictly requires a sorted array.',
        topicHint: 'Two-Pointer Monotonicity Precondition',
      },
      {
        id: 'd3-pre-2',
        question: 'In a variable-size sliding window on an array of length n, why is the overall time complexity O(n) even though there is a while loop inside the for loop?',
        options: [
          'Because the inner loop runs only once in total.',
          'Because the left pointer only moves forward and can advance at most n times across the entire algorithm.',
          'Because sliding window algorithms use binary search.',
          'Because the array is divided in half at each step.',
        ],
        correctIndex: 1,
        explanation: 'Amortized analysis: the right pointer increments n times (once per outer step), and the left pointer only increments forward, advancing at most n times in total. Total pointer movements ≤ 2n = O(n).',
        topicHint: 'Amortized Window Complexity',
      },
      {
        id: 'd3-pre-3',
        question: 'In LeetCode #11 (Container With Most Water), why do we always move the pointer pointing to the SHORTER line inward?',
        options: [
          'Because the shorter line is lighter in memory.',
          'Because water height is constrained by the shorter line; moving the taller line inward could only decrease width without any chance of increasing height.',
          'Because the problem requires sorting the lines first.',
          'Because the longer line must always stay at the boundary.',
        ],
        correctIndex: 1,
        explanation: 'Area = (right - left) × min(h[left], h[right]). Moving the taller pointer reduces width while the height remains bounded by the shorter line, guaranteeing area cannot increase. Only moving the shorter pointer offers a chance of finding a taller line.',
        topicHint: 'Greedy Choice Property in Container With Water',
      },
    ],
    coreConcepts: [
      {
        title: 'Opposite-Direction Pointers on Sorted Arrays',
        plainLanguageDefinition:
          'Place one pointer at index 0 (left) and one pointer at index n - 1 (right). Compute the metric; if too small, increment left; if too large, decrement right. Continue until pointers meet.',
        whyItMatters:
          'Transforms O(n²) search problems into O(n) time and O(1) space by leveraging sorted order to eliminate half the remaining search space with each decision.',
        visualRepresentation: `
Two Sum II (Sorted Array) Convergence:
-------------------------------------------------------------------------
Target = 9
Array:   [ 2,   7,  11,  15 ]
          ^               ^
         left           right   sum = 2 + 15 = 17 > 9 -> decrement right!

Array:   [ 2,   7,  11,  15 ]
          ^          ^
         left      right        sum = 2 + 11 = 13 > 9 -> decrement right!

Array:   [ 2,   7,  11,  15 ]
          ^     ^
         left  right            sum = 2 + 7 = 9 == Target! -> Match found!
-------------------------------------------------------------------------`,
        codeTemplate: `def two_sum_sorted(numbers: list[int], target: int) -> list[int]:
    left = 0
    right = len(numbers) - 1
    while left < right:
        curr = numbers[left] + numbers[right]
        if curr == target:
            return [left + 1, right + 1] # 1-based indexing
        elif curr < target:
            left += 1
        else:
            right -= 1
    return []`,
        complexityAnalysis: {
          time: 'O(n) — pointers meet in at most n steps',
          space: 'O(1) — two integer pointer registers',
          explanation: 'Strictly linear time and constant auxiliary memory.',
        },
      },
      {
        title: 'Variable-Size Sliding Window Invariant',
        plainLanguageDefinition:
          'A contiguous window [left, right] that expands by moving the right pointer and contracts by moving the left pointer whenever an invariant (e.g. no repeating characters) is violated.',
        whyItMatters:
          'Eliminates generating all O(n²) contiguous substrings/subarrays by maintaining valid window state incrementally in O(n) total time.',
        visualRepresentation: `
Longest Substring Without Repeating Characters (LC #3):
-------------------------------------------------------------------------
s = "p w w k e w"
Window [left..right]:
- right=0 ('p'): window="p", seen={'p':0}, max_len=1
- right=1 ('w'): window="pw", seen={'p':0, 'w':1}, max_len=2
- right=2 ('w'): duplicate 'w'! Move left past earlier 'w': left = 2
                 window="w", seen={'w':2}, max_len=2
- right=3 ('k'): window="wk", seen={'w':2, 'k':3}, max_len=2
- right=4 ('e'): window="wke", seen={'w':2, 'k':3, 'e':4}, max_len=3!
-------------------------------------------------------------------------`,
        codeTemplate: `def length_of_longest_substring(s: str) -> int:
    char_index = {}
    left = 0
    max_len = 0

    for right, ch in enumerate(s):
        if ch in char_index and char_index[ch] >= left:
            left = char_index[ch] + 1
        char_index[ch] = right
        max_len = max(max_len, right - left + 1)

    return max_len`,
        complexityAnalysis: {
          time: 'O(n) — each character processed once by right pointer',
          space: 'O(min(n, alphabet_size)) — hash map storing character positions',
          explanation: 'Linear time with bounded auxiliary space.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Problem mentions sorted array + pair sum/difference -> Opposite Pointers.',
        'Problem mentions contiguous subarray/substring with condition -> Sliding Window.',
        'Problem asks for minimum/maximum length satisfying constraint -> Dynamic Sliding Window.',
      ],
      preconditions: [
        'For two-pointer target search: input must be sorted.',
        'For sliding window: expanding right must monotonically move the metric in one direction.',
      ],
      whenNotToUse: [
        'Do not use sliding window if negative numbers break monotonicity of window sum (use prefix map instead).',
        'Do not use opposite pointers on unsorted data without permission to sort (sorting takes O(n log n) and modifies original indices).',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Two sum in sorted array',
          recommendedPattern: 'Opposite Pointers',
          why: 'Sorted property enables O(n) time and O(1) space without a hash map.',
        },
        {
          problemOrQuery: '3Sum (find all unique triplets summing to 0)',
          recommendedPattern: 'Sort + Fix one element + Two Pointers',
          why: 'Sorting takes O(n log n); outer loop fixes first element, two pointers scan remainder in O(n), total O(n²).',
        },
        {
          problemOrQuery: 'Minimum Size Subarray Sum (all positive)',
          recommendedPattern: 'Dynamic Sliding Window',
          why: 'Monotonic sum allows expanding right until sum >= target, then shrinking left to minimize window length.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd3-exit-1',
        question: 'In LeetCode #15 (3Sum), how do we avoid generating duplicate triplets without using an expensive set?',
        options: [
          'By sorting the array and skipping identical adjacent elements for both the fixed element and the two pointers.',
          'By running the algorithm 3 times.',
          'By multiplying all elements by -1.',
          'Duplicates cannot be avoided without a set.',
        ],
        correctIndex: 0,
        explanation: 'Sorting clusters duplicates together. After processing nums[i], skip any nums[i] == nums[i-1]. Similarly, after finding a match with left and right, advance both while values match their predecessors.',
        topicHint: 'Duplicate Elimination in 3Sum',
      },
      {
        id: 'd3-exit-2',
        question: 'In LeetCode #209 (Minimum Size Subarray Sum), what is the contraction condition for the left pointer?',
        options: [
          'Contract left while current window sum is strictly less than target.',
          'Contract left while current window sum is >= target, recording the minimum window length at each step.',
          'Contract left only when right reaches the end of the array.',
          'Contract left whenever a zero is encountered.',
        ],
        correctIndex: 1,
        explanation: 'Once the window sum reaches or exceeds target, we record min_len = min(min_len, right - left + 1) and increment left to see if a shorter valid subarray exists.',
        topicHint: 'Sliding Window Contraction Condition',
      },
    ],
  },

  // =========================================================================
  // DAY 4: Sorting & Binary Search (Official Curriculum Extension)
  // =========================================================================
  4: {
    day: 4,
    title: 'Sorting & Binary Search',
    estimatedMinutes: 35,
    learningOutcomes: [
      'Master the binary search loop invariant: search space [left, right], midpoint calculation without integer overflow.',
      'Differentiate exact search from lower bound / first-occurrence and upper bound search.',
      'Solve binary search on rotated sorted arrays by determining which half is sorted.',
      'Apply binary search on the answer space (monotone predicate function).',
      'Explain why comparison-based sorting has an information-theoretic lower bound of Ω(n log n).',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd4-pre-1',
        question: 'How many comparisons does binary search require in the worst case on a sorted array of 1,024 elements?',
        options: ['1,024', '512', '10 (since 2¹⁰ = 1,024)', '1'],
        correctIndex: 2,
        explanation: 'Binary search halves the search space at every step. log₂(1024) = 10 comparisons, illustrating logarithmic efficiency.',
        topicHint: 'Logarithmic Halving Search Space',
      },
      {
        id: 'd4-pre-2',
        question: 'Why is mid = left + (right - left) // 2 preferred over mid = (left + right) // 2 in many programming languages?',
        options: [
          'Because left + (right - left) // 2 is faster on hardware.',
          'Because (left + right) can cause 32-bit signed integer overflow when left and right are very large numbers near 2³¹ - 1.',
          'Because it works on negative indices.',
          'Because it avoids floating point division.',
        ],
        correctIndex: 1,
        explanation: 'In languages with fixed-width integers (C++, Java), (left + right) can exceed 2,147,483,647 and overflow into negative numbers. Computing left + (right - left) // 2 guarantees no intermediate sum exceeds the array bounds.',
        topicHint: 'Integer Overflow Prevention',
      },
    ],
    coreConcepts: [
      {
        title: 'Binary Search Loop Invariant & Boundary Conventions',
        plainLanguageDefinition:
          'Maintain a search space [left, right] where the target is guaranteed to lie if it exists in the array. In each iteration, inspect mid and discard the half that cannot contain the target.',
        whyItMatters:
          'Off-by-one errors in binary search (`left <= right` vs `left < right`, `right = mid` vs `right = mid - 1`) are a notorious source of bugs and interview rejections.',
        visualRepresentation: `
Standard Binary Search Template (Closed Interval [left, right]):
-------------------------------------------------------------------------
Initial: left = 0, right = n - 1
Loop Condition: while left <= right:
Midpoint: mid = left + (right - left) // 2

If arr[mid] == target: return mid
If arr[mid] < target:  left = mid + 1   (discard left half + mid)
If arr[mid] > target:  right = mid - 1  (discard right half + mid)

If loop finishes without returning: target is not in array (return -1)
-------------------------------------------------------------------------`,
        codeTemplate: `def binary_search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
        complexityAnalysis: {
          time: 'O(log n) — search space halves every iteration',
          space: 'O(1) — three scalar integer pointers',
          explanation: 'Optimal search complexity in sorted contiguous collections.',
        },
      },
      {
        title: 'Binary Search on the Answer Space (Koko Eating Bananas LC #875)',
        plainLanguageDefinition:
          'When searching for an optimal numerical parameter (e.g. minimum speed, minimum capacity) where a predicate `can_finish(k)` is monotonic (False, False, ..., True, True), binary search over the range of possible answers.',
        whyItMatters:
          'Expands binary search beyond searching arrays to solving complex optimization problems in O(n log(max_val)) time.',
        visualRepresentation: `
Monotonic Feasibility Space for Speed k:
Speed k:        1    2    3    4    5    6    7    8    9
Can Finish?     F    F    F    F    T    T    T    T    T
                                    ^
                                  Target: Minimum speed k = 5!
Binary search over [1, max(piles)] finds the first 'T' in O(log(max_pile)) iterations!`,
        codeTemplate: `import math

def min_eating_speed(piles: list[int], h: int) -> int:
    def can_finish(speed: int) -> bool:
        total_hours = sum(math.ceil(pile / speed) for pile in piles)
        return total_hours <= h

    left, right = 1, max(piles)
    ans = right

    while left <= right:
        mid = left + (right - left) // 2
        if can_finish(mid):
            ans = mid
            right = mid - 1 # Try to find a smaller valid speed
        else:
            left = mid + 1  # Speed too slow, increase speed

    return ans`,
        complexityAnalysis: {
          time: 'O(n log(max(piles)))',
          space: 'O(1) auxiliary space',
          explanation: 'Each feasibility check takes O(n) time across log(max_pile) binary search steps.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Input is sorted and asks for target position -> Standard Binary Search.',
        'Input is sorted with duplicates and asks for boundary -> Lower / Upper Bound Binary Search.',
        'Input is a sorted array rotated at an unknown pivot -> Rotated Binary Search (#33).',
        'Problem asks for minimum/maximum speed, capacity, or threshold -> Binary Search on Answer (#875).',
      ],
      preconditions: [
        'Search domain must have a monotonic property: condition(x) implies condition(x+1).',
      ],
      whenNotToUse: [
        'Do not use binary search on unsorted arrays without monotonicity.',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Find exact target in sorted array',
          recommendedPattern: 'Exact Binary Search [left <= right]',
          why: 'Direct check returns immediately when nums[mid] == target.',
        },
        {
          problemOrQuery: 'Find first and last position of element in sorted array',
          recommendedPattern: 'Lower Bound & Upper Bound Binary Search',
          why: 'Continuing search after match finds leftmost and rightmost boundary in 2 × O(log n) time.',
        },
        {
          problemOrQuery: 'Search in Rotated Sorted Array',
          recommendedPattern: 'Rotated Binary Search (Half-Sorted Check)',
          why: 'At least one half is always strictly sorted; check if target lies within the sorted half.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd4-exit-1',
        question: 'In LeetCode #33 (Search in Rotated Sorted Array), how do we determine which half of the array [left..mid] or [mid..right] is normally sorted?',
        options: [
          'If nums[left] <= nums[mid], the left half is sorted; otherwise the right half is sorted.',
          'By counting the number of elements.',
          'By checking if nums[0] is negative.',
          'Both halves are always sorted.',
        ],
        correctIndex: 0,
        explanation: 'Because the original array was strictly ascending before rotation, a single rotation splits it into two sorted subarrays. Comparing nums[left] <= nums[mid] reliably identifies whether the left half has unbroken sorted order.',
        topicHint: 'Rotated Array Half-Sorted Invariant',
      },
    ],
  },

  // =========================================================================
  // DAY 5: Linked Lists (Official Curriculum Extension)
  // =========================================================================
  5: {
    day: 5,
    title: 'Linked Lists',
    estimatedMinutes: 35,
    learningOutcomes: [
      'Understand linked list node references, pointer manipulation, and memory layout vs contiguous arrays.',
      'Apply the Dummy Node pattern to eliminate special boundary cases for empty lists and head deletions/insertions.',
      'Reverse a linked list in-place using 3 pointers (prev, curr, nxt) in O(n) time and O(1) memory.',
      'Detect cycles and locate cycle entry points using Floyd\'s Tortoise and Hare Algorithm.',
      'Remove the n-th node from the end in a single pass using two pointers separated by n steps.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd5-pre-1',
        question: 'Why does accessing the k-th element of a singly linked list take O(k) time, while an array takes O(1)?',
        options: [
          'Because linked lists are stored on disk, not RAM.',
          'Because linked list nodes are scattered across memory and can only be accessed by traversing node.next pointers sequentially from the head.',
          'Because linked lists do not support integer values.',
          'Because Python lists are actually linked lists.',
        ],
        correctIndex: 1,
        explanation: 'Unlike arrays with contiguous memory and pointer arithmetic (base + k * sizeof), linked list nodes have dynamic memory addresses and require O(k) sequential pointer dereferences.',
        topicHint: 'Sequential Pointer Traversal vs Direct Indexing',
      },
      {
        id: 'd5-pre-2',
        question: 'What is the primary benefit of creating a "dummy node" whose next pointer points to the head of a linked list?',
        options: [
          'It reduces time complexity to O(log n).',
          'It eliminates edge cases when modifying or deleting the head node, ensuring the list always has a non-null predecessor.',
          'It reverses the list automatically.',
          'It detects cycles.',
        ],
        correctIndex: 1,
        explanation: 'A dummy node (e.g. dummy = ListNode(0, head)) provides a permanent reference before the real head, making head deletions, insertions, and merges uniform with internal node operations.',
        topicHint: 'The Dummy Node Design Pattern',
      },
    ],
    coreConcepts: [
      {
        title: 'In-Place Linked List Reversal (Three-Pointer Method)',
        plainLanguageDefinition:
          'Reverse all next pointers in a linked list using three tracking pointers: prev, curr, and nxt, modifying pointers in-place with O(1) auxiliary space.',
        whyItMatters:
          'Foundational linked list skill; forms the core subroutine for palindrome verification (#234) and reverse in k-groups (#25).',
        visualRepresentation: `
Three-Pointer Reversal Step:
-------------------------------------------------------------------------
Initial: prev = None, curr = head (1)
List:    [1] -> [2] -> [3] -> None

Step 1:
- nxt = curr.next        (Save reference to node 2)
- curr.next = prev       (Point node 1 back to None)
- prev = curr            (Advance prev to node 1)
- curr = nxt             (Advance curr to node 2)

Result after full traversal: prev points to new head [3] -> [2] -> [1] -> None!
-------------------------------------------------------------------------`,
        codeTemplate: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head: ListNode | None) -> ListNode | None:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`,
        complexityAnalysis: {
          time: 'O(n) — visits every node exactly once',
          space: 'O(1) auxiliary space — three pointer variables',
          explanation: 'Reverses pointers in-place without copying node values.',
        },
      },
      {
        title: 'Floyd\'s Cycle Detection (Tortoise and Hare)',
        plainLanguageDefinition:
          'Move slow pointer by 1 step and fast pointer by 2 steps. If a cycle exists, fast will catch up and meet slow inside the cycle. If fast reaches None, no cycle exists.',
        whyItMatters:
          'Detects cycles in O(n) time and O(1) space, avoiding an O(n) hash set of visited memory addresses.',
        visualRepresentation: `
Cycle Meeting Point & Entry Point Mathematics:
-------------------------------------------------------------------------
Head ----(Distance L)----> Cycle Entry ----(Distance x)----> Meeting Point
                                ^                               |
                                +-------------(C - x)-----------+

When slow and fast meet:
Fast traveled 2 × (L + x) = L + x + k × C  ==> L = k × C - x = (k-1) × C + (C - x)
Mathematical conclusion: Distance from Head to Cycle Entry (L) equals
Distance from Meeting Point to Cycle Entry ((k-1)C + (C - x))!
Moving one pointer from Head and one from Meeting Point at speed 1 guarantees they meet at Cycle Entry!`,
        codeTemplate: `def detect_cycle(head: ListNode | None) -> ListNode | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            # Cycle detected; find entry
            ptr1 = head
            ptr2 = slow
            while ptr1 != ptr2:
                ptr1 = ptr1.next
                ptr2 = ptr2.next
            return ptr1 # Cycle entry node
    return None`,
        complexityAnalysis: {
          time: 'O(n) — fast meets slow in at most one full loop around cycle',
          space: 'O(1) — two pointer references',
          explanation: 'Optimal time and memory; avoids allocating a hash set of visited node pointers.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Reversing all or part of list -> 3-pointer in-place reversal.',
        'Cycle detection or finding loop start -> Fast and Slow Pointers (Floyd\'s).',
        'Finding n-th node from end -> Two pointers separated by n steps.',
        'Merging or reordering sorted lists -> Dummy node + tail pointer.',
      ],
      preconditions: [
        'Always check for `node` and `node.next` before accessing `node.next.next` to avoid NoneType attribute errors.',
      ],
      whenNotToUse: [
        'Do not allocate extra arrays to store node values when in-place pointer manipulation is requested.',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Reverse Linked List',
          recommendedPattern: '3-Pointer In-Place Reversal',
          why: 'O(n) time and O(1) space without modifying node values.',
        },
        {
          problemOrQuery: 'Linked List Cycle',
          recommendedPattern: 'Floyd\'s Tortoise and Hare',
          why: 'O(1) space cycle detection beats O(n) hash set of node IDs.',
        },
        {
          problemOrQuery: 'Remove Nth Node From End',
          recommendedPattern: 'Dummy Head + Fast/Slow with N-gap',
          why: 'Single pass deletes target node without needing to count list length first.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd5-exit-1',
        question: 'Why does Floyd\'s cycle detection guarantee that fast will never "hop over" slow inside the cycle without meeting?',
        options: [
          'Because in each step, the distance between fast and slow decreases by exactly 1 modulo the cycle length.',
          'Because fast moves backwards.',
          'Because linked lists are finite.',
          'Because the cycle length is always even.',
        ],
        correctIndex: 0,
        explanation: 'Relative speed: fast moves 2 steps while slow moves 1 step, closing the distance by exactly 1 step per iteration. In discrete modular arithmetic, a distance decreasing by 1 cannot skip 0.',
        topicHint: 'Relative Speed in Floyd\'s Algorithm',
      },
    ],
  },

  // =========================================================================
  // DAY 6: Stacks & Queues (Official Curriculum Extension)
  // =========================================================================
  6: {
    day: 6,
    title: 'Stacks & Queues',
    estimatedMinutes: 35,
    learningOutcomes: [
      'Master LIFO (Last-In, First-Out) stack semantics and FIFO (First-In, First-Out) queue semantics.',
      'Validate nested brackets and matching pairs using a stack in O(n) time.',
      'Design a MinStack supporting push, pop, top, and getMin in strictly O(1) time.',
      'Apply monotonic stacks to solve Next Greater Element and Daily Temperatures in O(n) amortized time.',
      'Implement an efficient queue using two stacks with amortized O(1) operations.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd6-pre-1',
        question: 'What is the defining structural difference between a Stack and a Queue?',
        options: [
          'Stack is LIFO (Last-In, First-Out); Queue is FIFO (First-In, First-Out).',
          'Stack is FIFO; Queue is LIFO.',
          'Stacks only store integers; Queues store objects.',
          'Stacks have O(n) pop; Queues have O(1) dequeue.',
        ],
        correctIndex: 0,
        explanation: 'A stack operates like a stack of plates (last plate placed is the first removed: LIFO). A queue operates like a cafeteria line (first person in line is served first: FIFO).',
        topicHint: 'LIFO vs FIFO Principles',
      },
      {
        id: 'd6-pre-2',
        question: 'In LeetCode #20 (Valid Parentheses), what condition proves that an expression is invalid when encountering a closing bracket like ")"?',
        options: [
          'The stack is non-empty.',
          'The stack is empty, or the popped top element does not match the closing bracket.',
          'The input string length is even.',
          'The bracket is followed by another closing bracket.',
        ],
        correctIndex: 1,
        explanation: 'If a closing bracket arrives when the stack is empty (no opening bracket precedes it) or when the top opening bracket does not match, the expression violates nesting rules and is invalid.',
        topicHint: 'Matching Parentheses Invariant',
      },
    ],
    coreConcepts: [
      {
        title: 'Min Stack Design with Strictly O(1) Operations',
        plainLanguageDefinition:
          'A stack data structure that retrieves the minimum element in O(1) time by maintaining an auxiliary min-tracker or pairing each value with the minimum seen up to that depth.',
        whyItMatters:
          'Interview favorite testing space-time trade-offs. Scanning the stack for the minimum takes O(n); storing running minimums takes O(n) extra space to guarantee O(1) retrieval.',
        visualRepresentation: `
Min Stack State Machine:
-------------------------------------------------------------------------
Push -2:   Stack: [(-2, min: -2)]
Push  0:   Stack: [(-2, min: -2), (0, min: -2)]
Push -3:   Stack: [(-2, min: -2), (0, min: -2), (-3, min: -3)]

getMin():  Top min value = -3  (O(1) time!)
Pop():     Removes (-3, min: -3)
getMin():  Top min value = -2  (Previous minimum automatically restored in O(1)!)
-------------------------------------------------------------------------`,
        codeTemplate: `class MinStack:
    def __init__(self):
        self.stack = [] # stores tuples: (val, min_at_this_level)

    def push(self, val: int) -> None:
        curr_min = val if not self.stack else min(val, self.stack[-1][1])
        self.stack.append((val, curr_min))

    def pop(self) -> None:
        if self.stack:
            self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]

    def getMin(self) -> int:
        return self.stack[-1][1]`,
        complexityAnalysis: {
          time: 'All operations push, pop, top, getMin are strictly O(1)',
          space: 'O(n) auxiliary space to store running minimums',
          explanation: 'Coupling each entry with its prefix-minimum guarantees instant retrieval on pop.',
        },
      },
      {
        title: 'Monotonic Stack for Next Greater Element (LC #739 Daily Temperatures)',
        plainLanguageDefinition:
          'Maintain a stack whose elements are strictly decreasing. When an incoming element is larger than the stack\'s top, pop elements and resolve their "next greater element" relationship.',
        whyItMatters:
          'Converts nested-loop O(n²) forward searches into an elegant O(n) linear scan where each element is pushed and popped at most once.',
        visualRepresentation: `
Monotonic Decreasing Stack on Temperatures: [73, 74, 75, 71, 69, 72]
-------------------------------------------------------------------------
Day 0 (73): Stack: [0 (73)]
Day 1 (74): 74 > 73! Pop 0 -> Day 0 waited (1 - 0) = 1 day. Push 1. Stack: [1 (74)]
Day 2 (75): 75 > 74! Pop 1 -> Day 1 waited (2 - 1) = 1 day. Push 2. Stack: [2 (75)]
Day 3 (71): 71 < 75. Push 3. Stack: [2 (75), 3 (71)]
Day 4 (69): 69 < 71. Push 4. Stack: [2 (75), 3 (71), 4 (69)]
Day 5 (72): 72 > 69! Pop 4 -> Day 4 waited (5 - 4) = 1 day.
            72 > 71! Pop 3 -> Day 3 waited (5 - 3) = 2 days.
            72 < 75. Push 5. Stack: [2 (75), 5 (72)]
-------------------------------------------------------------------------`,
        codeTemplate: `def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    ans = [0] * n
    stack = [] # stores indices of temperatures

    for i, temp in enumerate(temperatures):
        while stack and temp > temperatures[stack[-1]]:
            prev_i = stack.pop()
            ans[prev_i] = i - prev_i
        stack.append(i)

    return ans`,
        complexityAnalysis: {
          time: 'O(n) — each index is pushed once and popped at most once',
          space: 'O(n) worst-case space if temperatures are strictly decreasing',
          explanation: 'Amortized linear time.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Nested matching, undo operations, expression syntax -> LIFO Stack.',
        'Next greater element, temperature increase, histogram rectangle -> Monotonic Stack.',
        'Stream processing, level-order traversal, round-robin buffering -> FIFO Queue.',
      ],
      preconditions: [
        'Always check `stack is non-empty` before calling `stack[-1]` or `stack.pop()`.',
      ],
      whenNotToUse: [
        'Do not use nested loops to find the next greater element when n > 1,000.',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Valid Parentheses',
          recommendedPattern: 'LIFO Stack with bracket map',
          why: 'Closing brackets must match the most recently opened unmatched bracket.',
        },
        {
          problemOrQuery: 'Next Greater Element / Daily Temperatures',
          recommendedPattern: 'Monotonic Decreasing Stack of Indices',
          why: 'Resolves all pending smaller elements in O(n) amortized time.',
        },
        {
          problemOrQuery: 'Implement Queue using Stacks',
          recommendedPattern: 'Two Stacks (in_stack & out_stack)',
          why: 'Transfers elements only when out_stack is empty, ensuring amortized O(1) dequeue.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd6-exit-1',
        question: 'Why is the amortized time complexity of dequeuing from a Two-Stack Queue O(1), even though transferring elements between stacks takes O(n)?',
        options: [
          'Because each element is transferred from in_stack to out_stack exactly once during its entire lifetime in the queue.',
          'Because Python lists are implemented in C.',
          'Because transfers happen in the background.',
          'Because stacks use O(1) memory.',
        ],
        correctIndex: 0,
        explanation: 'Amortized aggregate analysis: over n enqueue and dequeue operations, every element is pushed to in_stack once, popped once, pushed to out_stack once, and popped once. Total work is 4n operations, averaging O(1) per operation.',
        topicHint: 'Amortized Analysis of Two-Stack Queue',
      },
    ],
  },

  // =========================================================================
  // DAY 7: Trees & Binary Search Trees (Official Curriculum Extension)
  // =========================================================================
  7: {
    day: 7,
    title: 'Trees & Binary Search Trees',
    estimatedMinutes: 35,
    learningOutcomes: [
      'Master recursive tree definitions: base cases (null node), bottom-up post-order aggregation vs top-down pre-order passing.',
      'Differentiate DFS traversals (Pre-order, In-order, Post-order) and BFS Level-Order Traversal.',
      'Explain why in-order traversal of a valid Binary Search Tree produces strictly ascending order.',
      'Validate BSTs correctly using global lower and upper bound ranges, rather than local parent-child comparisons.',
      'Find Lowest Common Ancestor (LCA) using elegant post-order recursive divergence.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd7-pre-1',
        question: 'Why is checking whether root.left.val < root.val and root.right.val > root.val INSUFFICIENT to validate a Binary Search Tree?',
        options: [
          'Because BSTs can only have integer keys.',
          'Because it only validates local parent-child relationships; a node in the right subtree might still violate BST properties by being smaller than an ancestor.',
          'Because BST validation requires sorting.',
          'Because leaves do not have children.',
        ],
        correctIndex: 1,
        explanation: 'Classic interview trap! Consider root = 10, right child = 15, and right child\'s left child = 6. Locally 6 < 15, but globally 6 < 10 in the right subtree, violating the BST definition. Validation requires passing a global (min_val, max_val) range.',
        topicHint: 'Global Range vs Local BST Validation',
      },
      {
        id: 'd7-pre-2',
        question: 'What is the auxiliary space complexity of recursive DFS on a binary tree of n nodes in the worst case?',
        options: [
          'Always O(1)',
          'Always O(log n)',
          'O(n) in the worst case (when the tree is completely skewed like a linked list), and O(log n) when the tree is balanced.',
          'O(n²)',
        ],
        correctIndex: 2,
        explanation: 'The call stack depth equals the height h of the tree. A balanced tree has height h = log₂(n), requiring O(log n) stack frames. A skewed tree has height h = n, requiring O(n) call stack frames.',
        topicHint: 'Tree Height & Call Stack Depth',
      },
    ],
    coreConcepts: [
      {
        title: 'Tree Recursion: Top-Down vs Bottom-Up Aggregation',
        plainLanguageDefinition:
          'Tree problems decompose naturally: solve the left subtree, solve the right subtree, and combine their results at the current root (bottom-up), or pass parent constraints downward (top-down).',
        whyItMatters:
          'Understanding base cases (`if not root: return 0`) and post-order aggregation is the foundation for max depth, tree diameter, balanced tree checks, and LCA.',
        visualRepresentation: `
Post-Order Bottom-Up Aggregation (Maximum Depth LC #104):
-------------------------------------------------------------------------
          1
         / \\
        2   3
       /
      4

Call Stack Unwinding:
- Leaf 4: left_depth=0, right_depth=0 -> depth = 1 + max(0, 0) = 1
- Node 2: left_depth=1 (from 4), right_depth=0 -> depth = 1 + max(1, 0) = 2
- Node 3: left_depth=0, right_depth=0 -> depth = 1 + max(0, 0) = 1
- Root 1: left_depth=2, right_depth=1 -> depth = 1 + max(2, 1) = 3!
-------------------------------------------------------------------------`,
        codeTemplate: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root: TreeNode | None) -> int:
    # Base case: empty tree has depth 0
    if not root:
        return 0
    # Recursive step: 1 + max depth of subtrees
    return 1 + max(max_depth(root.left), max_depth(root.right))`,
        complexityAnalysis: {
          time: 'O(n) — visits every node exactly once',
          space: 'O(h) call stack memory where h is tree height',
          explanation: 'Visits all n nodes with stack space proportional to height.',
        },
      },
      {
        title: 'Validating BST with Global Bounds (LC #98)',
        plainLanguageDefinition:
          'Every node in the left subtree of node x must be strictly less than x.val; every node in the right subtree must be strictly greater than x.val. Pass (low, high) bounds down recursively.',
        whyItMatters:
          'One of the most frequently failed medium problems when candidates make the fatal mistake of checking only direct children.',
        visualRepresentation: `
Global Bound Propagation:
-------------------------------------------------------------------------
                [Root: 10] (-inf, +inf)
               /                      \\
    [Left: 5] (-inf, 10)       [Right: 15] (10, +inf)
           /        \\                 /          \\
         [3]        [7]             [6] ! INVALID! [20]
     (-inf, 5)    (5, 10)         (10, 15)
                                  Node 6 fails because 6 is NOT > 10!
-------------------------------------------------------------------------`,
        codeTemplate: `def is_valid_bst(root: TreeNode | None) -> bool:
    def validate(node: TreeNode | None, low: float, high: float) -> bool:
        if not node:
            return True
        if not (low < node.val < high):
            return False
        # Left child must be < node.val; Right child must be > node.val
        return validate(node.left, low, node.val) and validate(node.right, node.val, high)

    return validate(root, float('-inf'), float('inf'))`,
        complexityAnalysis: {
          time: 'O(n) — visits each node once',
          space: 'O(h) call stack memory',
          explanation: 'Enforces strict global ordering constraints.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Finding height, diameter, or path sum -> Bottom-up Post-Order DFS.',
        'Level-by-level inspection or shortest path in unweighted tree -> BFS Queue.',
        'Searching, inserting, or validating ordered values -> BST property exploitation.',
        'Finding shared ancestor -> Lowest Common Ancestor (LC #236).',
      ],
      preconditions: [
        'Always handle the null node base case: `if not root: return ...`',
      ],
      whenNotToUse: [
        'Do not assume a binary tree is a BST unless explicitly stated in the problem.',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Validate Binary Search Tree',
          recommendedPattern: 'Global Range Recursion (low, high)',
          why: 'Guarantees all ancestors\' constraints are satisfied, not just immediate parents.',
        },
        {
          problemOrQuery: 'Binary Tree Level Order Traversal',
          recommendedPattern: 'Queue BFS with level snapshot len(queue)',
          why: 'Processes nodes layer by layer in O(n) time and O(w) maximum layer width space.',
        },
        {
          problemOrQuery: 'Lowest Common Ancestor of Binary Tree',
          recommendedPattern: 'Post-Order Search with Result Divergence',
          why: 'If left and right subtrees both return non-null, current node is the LCA.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd7-exit-1',
        question: 'In LeetCode #102 (Binary Tree Level Order Traversal), how do we cleanly separate elements of different levels using a single queue?',
        options: [
          'By inserting a null marker between levels.',
          'By capturing the queue length (level_size = len(queue)) at the beginning of each level loop and popping exactly that many nodes.',
          'By using two separate queues.',
          'By storing depth in each node.',
        ],
        correctIndex: 1,
        explanation: 'At the start of each level iteration, the queue contains exclusively the nodes of the current level. Recording level_size = len(queue) and iterating level_size times ensures all current-level nodes are processed before any newly enqueued children.',
        topicHint: 'Queue Level Size Snapshot Pattern',
      },
    ],
  },

  // =========================================================================
  // DAY 8: Graph Algorithms (Official Curriculum Extension)
  // =========================================================================
  8: {
    day: 8,
    title: 'Graph Algorithms',
    estimatedMinutes: 40,
    learningOutcomes: [
      'Represent graphs using Adjacency Lists (O(V + E) memory) and Adjacency Matrices (O(V²) memory).',
      'Understand the algorithmic necessity of visited sets: omitting visited tracking on cyclic graphs causes INFINITE NON-TERMINATING RECURSION, not O(V!).',
      'Traverse graphs using BFS (shortest path in unweighted graphs) and DFS (connectivity, cycles).',
      'Implement grid flood-fill (Number of Islands LC #200) with in-place sinking to optimize auxiliary space.',
      'Detect cycles and compute topological ordering using Kahn\'s Algorithm (in-degree array + queue).',
      'Find shortest paths in weighted graphs with non-negative edges using Dijkstra\'s Algorithm.',
    ],
    startingKnowledgeCheck: [
      {
        id: 'd8-pre-1',
        question: 'What is the algorithmic consequence of performing Depth-First Search (DFS) on an undirected cyclic graph WITHOUT a visited tracking set?',
        options: [
          'The algorithm executes in O(V!) time.',
          'The algorithm oscillates endlessly between adjacent nodes (e.g. 0 -> 1 -> 0 -> 1...), causing infinite non-terminating execution and Call Stack Overflow.',
          'The algorithm terminates normally but skips some edges.',
          'The graph is automatically converted into a tree.',
        ],
        correctIndex: 1,
        explanation: 'In cyclic graphs, edges allow returning to previously visited vertices. Without visited tracking, DFS traverses the cycle indefinitely, resulting in non-termination and stack overflow. With visited tracking, it is guaranteed O(V + E).',
        topicHint: 'Visited Set Invariant & Non-Termination',
      },
      {
        id: 'd8-pre-2',
        question: 'Why is an Adjacency List preferred over an Adjacency Matrix for sparse graphs where E << V²?',
        options: [
          'Adjacency Matrix uses O(V²) space even if there are few edges, while an Adjacency List uses O(V + E) space and allows iterating only existing neighbors.',
          'Adjacency List is faster for finding if an edge exists between two specific vertices.',
          'Adjacency Matrix cannot store directed edges.',
          'Adjacency List automatically sorts the vertices.',
        ],
        correctIndex: 0,
        explanation: 'For a graph with 100,000 vertices and 100,000 edges, an adjacency matrix allocates 10¹⁰ entries (~40 GB memory), whereas an adjacency list stores only the 100,000 vertices and their actual neighbors (a few megabytes).',
        topicHint: 'Adjacency List vs Matrix Trade-Offs',
      },
      {
        id: 'd8-pre-3',
        question: 'In Kahn\'s algorithm for Topological Sort (Course Schedule LC #207), which vertices are pushed into the queue first?',
        options: [
          'Vertices with the highest out-degree.',
          'Vertices with an in-degree of 0 (no prerequisite dependencies).',
          'Vertices with an in-degree of 1.',
          'Randomly selected vertices.',
        ],
        correctIndex: 1,
        explanation: 'Vertices with in-degree 0 have no incoming prerequisite requirements and can be taken immediately. Processing them and decrementing their neighbors\' in-degrees unblocks subsequent courses.',
        topicHint: 'In-Degree Initialization in Kahn\'s Algorithm',
      },
    ],
    coreConcepts: [
      {
        title: 'Adjacency List Construction & Safe BFS Traversal',
        plainLanguageDefinition:
          'An adjacency list maps each vertex to a list of its directly connected neighbors. BFS explores vertices layer by layer using a FIFO queue and a visited set to prevent reprocessing.',
        whyItMatters:
          'Standard representation for virtually all competitive programming and interview graph problems. Guarantees optimal O(V + E) time and O(V + E) space.',
        visualRepresentation: `
Graph Representation & BFS State:
-------------------------------------------------------------------------
Edges: [[0, 1], [0, 2], [1, 2]]
Adjacency List:
0 -> [1, 2]
1 -> [0, 2]
2 -> [0, 1]

BFS Traversal from Node 0:
Queue: [0], Visited: {0}
- Pop 0: neighbors [1, 2]. Neither visited -> Mark visited {0, 1, 2}, Queue: [1, 2]
- Pop 1: neighbors [0, 2]. Both visited -> Skip.
- Pop 2: neighbors [0, 1]. Both visited -> Skip.
Queue empty -> Traversal complete in O(V + E) time!
-------------------------------------------------------------------------`,
        codeTemplate: `from collections import deque

def valid_path(n: int, edges: list[list[int]], source: int, destination: int) -> bool:
    if source == destination:
        return True

    # 1. Build Adjacency List
    adj: dict[int, list[int]] = {i: [] for i in range(n)}
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    # 2. BFS with Visited Set
    queue = deque([source])
    visited = {source}

    while queue:
        curr = queue.popleft()
        if curr == destination:
            return True
        for neighbor in adj[curr]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return False`,
        complexityAnalysis: {
          time: 'O(V + E) — each vertex is enqueued once, each edge explored twice (undirected)',
          space: 'O(V + E) — for adjacency list, visited set, and queue',
          explanation: 'Strictly linear in the size of the graph.',
        },
      },
      {
        title: 'Topological Sort & Cycle Detection via Kahn\'s Algorithm (LC #207)',
        plainLanguageDefinition:
          'Topological ordering is a linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge u -> v, u comes before v. If a cycle exists, no topological order exists.',
        whyItMatters:
          'Used in dependency resolution (build systems, package managers, course scheduling). Kahn\'s algorithm detects cycles in O(V + E) time.',
        visualRepresentation: `
Kahn's Algorithm Dependency Unwinding:
Prerequisites: [[1, 0]] (To take course 1, you must take course 0: 0 -> 1)
In-degree: {0: 0, 1: 1}

Step 1: In-degree 0 nodes: [0]. Enqueue 0.
Step 2: Pop 0. Processed count = 1.
        Decrement in-degree of neighbor 1: in-degree[1] becomes 0!
        Enqueue 1.
Step 3: Pop 1. Processed count = 2 == numCourses -> Return True (Can finish)!

Cycle Case (0 -> 1 and 1 -> 0):
In-degrees: {0: 1, 1: 1}. No node has in-degree 0! Queue starts empty!
Processed count = 0 < 2 -> Cycle detected, returns False!`,
        codeTemplate: `from collections import deque

def can_finish(numCourses: int, prerequisites: list[list[int]]) -> bool:
    adj = {i: [] for i in range(numCourses)}
    in_degree = [0] * numCourses

    for course, prereq in prerequisites:
        adj[prereq].append(course)
        in_degree[course] += 1

    queue = deque([i for i in range(numCourses) if in_degree[i] == 0])
    processed = 0

    while queue:
        curr = queue.popleft()
        processed += 1
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return processed == numCourses`,
        complexityAnalysis: {
          time: 'O(V + E) — builds graph and visits each vertex/edge once',
          space: 'O(V + E) — adjacency list and in-degree array',
          explanation: 'Deterministic cycle detection without recursion.',
        },
      },
    ],
    patternGuide: {
      howToIdentify: [
        'Finding if path exists between source and target -> BFS / DFS with Visited Set (#1971).',
        'Finding connected components on a 2D matrix -> Grid Flood Fill (#200 Number of Islands).',
        'Prerequisites, order of compilation, cycle in directed graph -> Kahn\'s Topological Sort (#207).',
        'Shortest path in weighted graph with non-negative weights -> Dijkstra\'s Algorithm (#743 Network Delay Time).',
      ],
      preconditions: [
        'Always maintain a visited set or in-place mark to prevent infinite loops in cyclic graphs.',
        'Dijkstra requires all edge weights to be non-negative (for negative weights, use Bellman-Ford).',
      ],
      whenNotToUse: [
        'Do NOT use Dijkstra on unweighted graphs (plain BFS is faster: O(V + E) vs O((V + E) log V)).',
        'Do NOT describe DFS without visited tracking as O(V!) or O(∞) — on cyclic graphs it simply fails to terminate. Valid traversal with visited tracking runs in O(V + E) time.',
      ],
      comparisonMatrix: [
        {
          problemOrQuery: 'Shortest path in unweighted graph',
          recommendedPattern: 'Breadth-First Search (BFS)',
          why: 'FIFO queue guarantees finding the target at the minimum number of edge hops in O(V + E) time.',
        },
        {
          problemOrQuery: 'Shortest path in weighted graph (weights >= 0)',
          recommendedPattern: 'Dijkstra\'s Algorithm with Min-Heap',
          why: 'Greedily extracts the closest unvisited vertex in O((V + E) log V) time.',
        },
        {
          problemOrQuery: 'Course Schedule / Cycle Detection in DAG',
          recommendedPattern: 'Kahn\'s Algorithm (In-degree + Queue)',
          why: 'Non-recursive, iterative dependency unwinding detects cycles if processed nodes < V.',
        },
        {
          problemOrQuery: 'Number of Islands (Grid)',
          recommendedPattern: 'Flood Fill DFS/BFS with In-place Sinking',
          why: 'Sinking visited land cells ("1" -> "0") avoids allocating an O(R × C) visited set.',
        },
      ],
    },
    exitCheck: [
      {
        id: 'd8-exit-1',
        question: 'Why does Kahn\'s algorithm fail to process all vertices when a directed cycle is present in the graph?',
        options: [
          'Because all vertices in a directed cycle have an in-degree of at least 1, so none can ever reach an in-degree of 0 to enter the queue.',
          'Because the queue overflows.',
          'Because cyclic graphs have negative edge weights.',
          'Because Python cannot store cyclic dictionaries.',
        ],
        correctIndex: 0,
        explanation: 'Every vertex within a directed cycle is waiting on another vertex in the cycle. None can ever reach an in-degree of 0, leaving them stranded outside the queue and resulting in processed < numCourses.',
        topicHint: 'Topological Sort Cycle Stranding',
      },
      {
        id: 'd8-exit-2',
        question: 'What is the time complexity of Dijkstra\'s algorithm implemented with a binary min-heap priority queue?',
        options: [
          'O(V²)',
          'O((V + E) log V)',
          'O(V!)',
          'O(V + E)',
        ],
        correctIndex: 1,
        explanation: 'Each vertex is extracted from the min-heap at most once (V * log V), and each edge relaxation can insert an updated distance into the heap (E * log V), yielding O((V + E) log V).',
        topicHint: 'Dijkstra Heap Complexity',
      },
      {
        id: 'd8-exit-3',
        question: 'In LeetCode #200 (Number of Islands), why is "sinking" visited land cells from "1" to "0" considered a standard optimization?',
        options: [
          'It reduces time complexity from O(M*N) to O(1).',
          'It reuses the input grid to record visited state, saving an O(M * N) auxiliary visited set/matrix.',
          'It allows diagonal connections.',
          'It prevents recursion.',
        ],
        correctIndex: 1,
        explanation: 'By mutating visited "1"s to "0"s, subsequent scans naturally ignore already processed land, eliminating the need for an external visited hash set or boolean 2D array.',
        topicHint: 'In-Place Grid Sinking Space Optimization',
      },
    ],
  },
};
