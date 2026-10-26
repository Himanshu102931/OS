/**
 * PlacementOS — Guided DSA Challenge Solutions & Educational Scaffolds
 *
 * Provides complete, syntactically verified Python reference code, detailed comments,
 * mathematical correctness arguments, at least three boundary-aware test cases,
 * common beginner pitfalls, and metacognitive explain-back prompts for all 40 guided problems.
 *
 * Authored to match the pedagogical standard of Day 1 and Day 2 trainer decks.
 */

export interface TestCaseData {
  readonly name: string;
  readonly input: string;
  readonly expectedOutput: string;
  readonly explanation: string;
}

export interface GuidedSolutionDetails {
  readonly whyOptimizedMatters: string;
  readonly pythonReferenceCode: string;
  readonly correctnessArgument: string;
  readonly testCases: readonly TestCaseData[];
  readonly commonMistakes: readonly string[];
  readonly explainBackPrompt: string;
}

export const GUIDED_SOLUTIONS_REGISTRY: Record<number, GuidedSolutionDetails> = {
  // =========================================================================
  // DAY 1: Logic Building, Complexity & Arrays
  // =========================================================================
  344: {
    whyOptimizedMatters:
      'Allocating a new string or array takes O(N) auxiliary space. The two-pointer in-place swap achieves O(N) time using strictly O(1) extra memory, which is essential for memory-constrained embedded systems and large text buffers.',
    pythonReferenceCode: `def reverseString(s: list[str]) -> None:
    """
    Do not return anything, modify s in-place instead.
    Two pointers starting at opposite boundaries swap inwards until they meet.
    """
    left = 0
    right = len(s) - 1

    while left < right:
        # In-place tuple swap without allocating extra memory
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1`,
    correctnessArgument:
      'Loop Invariant: At each step, all characters at indices < left and > right are already in their final reversed positions. Since left increases by 1 and right decreases by 1 in each step, the distance (right - left) strictly decreases, guaranteeing termination at the midpoint.',
    testCases: [
      {
        name: 'Standard odd-length word',
        input: 's = ["h","e","l","l","o"]',
        expectedOutput: '["o","l","l","e","h"]',
        explanation: 'Characters at indices 0 and 4 swap, then 1 and 3 swap; index 2 remains in the center.',
      },
      {
        name: 'Even-length word',
        input: 's = ["H","a","n","n","a","h"]',
        expectedOutput: '["h","a","n","n","a","H"]',
        explanation: 'All 3 symmetric pairs swap until left = 3 and right = 2 terminates the while loop.',
      },
      {
        name: 'Single character boundary',
        input: 's = ["A"]',
        expectedOutput: '["A"]',
        explanation: 'left = 0, right = 0; the condition left < right is initially false, so no swaps occur and the array remains unchanged.',
      },
    ],
    commonMistakes: [
      'Using while left <= right: Swapping the center element with itself in an odd-length array does not change the result, but is an unnecessary operation.',
      'Returning a new list (e.g. return s[::-1]) instead of mutating s in-place as demanded by the problem signature.',
      'Off-by-one error: initializing right to len(s) instead of len(s) - 1, which causes an immediate IndexError.',
    ],
    explainBackPrompt:
      'Explain to a peer why swapping elements from both ends toward the middle visits only N/2 elements, but is still formally classified as O(N) time complexity.',
  },

  414: {
    whyOptimizedMatters:
      'Sorting takes O(N log N) time and modifying the array is often prohibited. Maintaining three distinct maximum variables finds the third distinct maximum in a single O(N) pass with O(1) auxiliary space.',
    pythonReferenceCode: `def thirdMax(nums: list[int]) -> int:
    """
    Finds the third distinct maximum in O(N) time and O(1) space.
    If fewer than 3 distinct values exist, returns the global maximum.
    """
    first = second = third = None

    for x in nums:
        # Skip duplicates: we only care about DISTINCT maximums
        if x in (first, second, third):
            continue

        if first is None or x > first:
            third = second
            second = first
            first = x
        elif second is None or x > second:
            third = second
            second = x
        elif third is None or x > third:
            third = x

    # If third distinct maximum does not exist, return the global maximum
    return third if third is not None else first`,
    correctnessArgument:
      'Invariant: At the end of each iteration, (first, second, third) contain the top three strictly distinct values observed in nums[0..i] so far (or None if fewer than 3 distinct values have been seen). Any incoming value that is already equal to one of the three is ignored, preserving distinctness.',
    testCases: [
      {
        name: 'Standard distinct three items',
        input: 'nums = [3, 2, 1]',
        expectedOutput: '1',
        explanation: 'Three distinct values exist; 1 is the third distinct maximum.',
      },
      {
        name: 'Fewer than three distinct values',
        input: 'nums = [1, 2]',
        expectedOutput: '2',
        explanation: 'Only two distinct values exist, so the problem requires returning the global maximum (2).',
      },
      {
        name: 'Repeated maximum values',
        input: 'nums = [2, 2, 3, 1]',
        expectedOutput: '1',
        explanation: 'The distinct values in sorted order are 3 (first), 2 (second), and 1 (third). Duplicate 2 is skipped.',
      },
    ],
    commonMistakes: [
      'Initializing first, second, third to 0 or -infinity: If the array contains negative numbers (e.g. [-2147483648]), integer sentinel values collide with actual array elements. Using None is completely safe.',
      'Treating equal maximums as distinct (e.g. thinking [5, 5, 5] has a second-largest value).',
    ],
    explainBackPrompt:
      'How does the logic in this problem extend the "find the second-largest distinct value" problem presented in Day 1 of the trainer deck?',
  },

  283: {
    whyOptimizedMatters:
      'Moving zeroes by creating a new array requires O(N) extra space. The read/write two-pointer partition moves zeroes to the end in a single O(N) pass with O(1) space while strictly preserving the relative order of non-zero elements.',
    pythonReferenceCode: `def moveZeroes(nums: list[int]) -> None:
    """
    Do not return anything, modify nums in-place instead.
    write_ptr points to the next available slot for a non-zero element.
    """
    write_ptr = 0

    # Pass 1: Compact non-zero elements into the front
    for read_ptr in range(len(nums)):
        if nums[read_ptr] != 0:
            nums[write_ptr] = nums[read_ptr]
            write_ptr += 1

    # Pass 2: Zero-fill the remainder of the array
    while write_ptr < len(nums):
        nums[write_ptr] = 0
        write_ptr += 1`,
    correctnessArgument:
      'Invariant: After examining index read_ptr, all non-zero elements up to read_ptr have been written to nums[0..write_ptr - 1] in their original relative sequence. The remaining elements from write_ptr to n - 1 are then safely overwritten with 0s without losing any data.',
    testCases: [
      {
        name: 'Standard mixed elements',
        input: 'nums = [0, 1, 0, 3, 12]',
        expectedOutput: '[1, 3, 12, 0, 0]',
        explanation: 'Non-zero elements 1, 3, 12 are compacted to indices 0, 1, 2; indices 3 and 4 are zero-filled.',
      },
      {
        name: 'All zeroes array',
        input: 'nums = [0, 0, 0]',
        expectedOutput: '[0, 0, 0]',
        explanation: 'write_ptr remains at 0; the second loop writes 0s to all positions.',
      },
      {
        name: 'No zeroes array',
        input: 'nums = [1, 2, 3]',
        expectedOutput: '[1, 2, 3]',
        explanation: 'write_ptr advances to index 3; the second loop does not execute.',
      },
    ],
    commonMistakes: [
      'Using nums.remove(0) and nums.append(0) inside a loop: remove() is an O(N) operation, turning the overall runtime into O(N²).',
      'Overwriting unread elements by advancing write_ptr faster than read_ptr (impossible since write_ptr <= read_ptr always).',
    ],
    explainBackPrompt:
      'Why is write_ptr guaranteed never to exceed read_ptr at any point during the execution?',
  },

  1: {
    whyOptimizedMatters:
      'The brute-force nested loop checks all n(n-1)/2 pairs in O(N²) time. By trading O(N) space for a hash map of previously seen numbers, we reduce lookup time to expected O(1), bringing total time down to expected O(N).',
    pythonReferenceCode: `def twoSum(nums: list[int], target: int) -> list[int]:
    """
    Finds two indices such that nums[i] + nums[j] == target.
    Stores {value: index} of previously processed elements.
    """
    seen: dict[int, int] = {}

    for i, x in enumerate(nums):
        complement = target - x
        # Check if the needed complement was already recorded
        if complement in seen:
            return [seen[complement], i]
        # Store current number and its index for future elements
        seen[x] = i

    return []`,
    correctnessArgument:
      'Invariant: At iteration i, the dictionary seen contains all nums[j] -> j for all j < i. Checking complement in seen verifies whether any earlier element pairs with nums[i] to equal target. Because we query BEFORE inserting nums[i], an element can never falsely pair with itself.',
    testCases: [
      {
        name: 'Standard two-element match',
        input: 'nums = [2, 7, 11, 15], target = 9',
        expectedOutput: '[0, 1]',
        explanation: 'At index 1 (x=7), complement 9-7=2 exists at index 0.',
      },
      {
        name: 'Identical pair values',
        input: 'nums = [3, 3], target = 6',
        expectedOutput: '[0, 1]',
        explanation: 'At index 1, complement 6-3=3 is found in seen (from index 0).',
      },
      {
        name: 'Negative numbers present',
        input: 'nums = [-3, 4, 3, 90], target = 0',
        expectedOutput: '[0, 2]',
        explanation: 'At index 2 (x=3), complement 0 - 3 = -3 is found at index 0.',
      },
    ],
    commonMistakes: [
      'Inserting x into seen BEFORE querying the complement: If target = 6 and x = 3, inserting first causes the check to find nums[i] matching itself at the same index.',
      'Assuming the array is sorted and attempting two-pointer inward search without accounting for the fact that sorting invalidates the original indices required in the output.',
    ],
    explainBackPrompt:
      'Explain the exact engineering trade-off: what did we spend, what did we gain, and what constraint does the hash map impose on the keys?',
  },

  121: {
    whyOptimizedMatters:
      'Comparing every buy day with every future sell day takes O(N²) time. By maintaining the minimum price observed so far, we calculate the maximum profit achievable on any selling day in a single O(N) pass with O(1) space.',
    pythonReferenceCode: `def maxProfit(prices: list[int]) -> int:
    """
    Calculates maximum single-transaction profit.
    Maintains the lowest purchase price observed prior to or on day i.
    """
    min_price_so_far = float('inf')
    max_profit = 0

    for price in prices:
        # Update lowest buying opportunity
        if price < min_price_so_far:
            min_price_so_far = price
        # Or calculate profit if sold today
        elif price - min_price_so_far > max_profit:
            max_profit = price - min_price_so_far

    return max_profit`,
    correctnessArgument:
      'Causality Invariant: For each day i, min_price_so_far represents min(prices[0..i]). Therefore, price - min_price_so_far is the optimal profit possible if day i is chosen as the selling day. Since we examine every possible selling day, max_profit is guaranteed to find the global optimum.',
    testCases: [
      {
        name: 'Standard profitable fluctuation',
        input: 'prices = [7, 1, 5, 3, 6, 4]',
        expectedOutput: '5',
        explanation: 'Buy at min price 1 on day 2, sell at price 6 on day 5 -> profit 6 - 1 = 5.',
      },
      {
        name: 'Monotonically decreasing prices',
        input: 'prices = [7, 6, 4, 3, 1]',
        expectedOutput: '0',
        explanation: 'No transaction produces positive profit; max profit remains 0.',
      },
      {
        name: 'Two days identical price',
        input: 'prices = [3, 3]',
        expectedOutput: '0',
        explanation: 'Profit is 3 - 3 = 0.',
      },
    ],
    commonMistakes: [
      'Selling before buying: finding min(prices) and max(prices) globally without verifying that the index of max is strictly after the index of min.',
      'Returning negative profit when prices strictly drop instead of returning 0 as specified.',
    ],
    explainBackPrompt:
      'Why is it impossible for this algorithm to ever record a sale that occurred chronologically before its purchase?',
  },

  // =========================================================================
  // DAY 2: Hashing & Prefix-Based Reasoning
  // =========================================================================
  242: {
    whyOptimizedMatters:
      'Sorting both strings takes O(N log N) time. A frequency map or fixed 26-character array achieves O(N) time with O(1) auxiliary space (for fixed alphabet size 26).',
    pythonReferenceCode: `def isAnagram(s: str, t: str) -> bool:
    """
    Determines if t is an anagram of s using character frequency counting.
    """
    # Quick reject: anagrams must have identical length
    if len(s) != len(t):
        return False

    counts: dict[str, int] = {}

    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1

    for ch in t:
        if ch not in counts:
            return False
        counts[ch] -= 1
        if counts[ch] < 0:
            return False

    # Because lengths match, all counts must now be exactly zero
    return True`,
    correctnessArgument:
      'Invariant: Every character in s increments its count by 1. Every character in t decrements its count by 1. If any character count goes negative, t contains more occurrences of that character than s. Since len(s) == len(t), if no count goes negative, all counts must sum to 0, proving exact equivalence.',
    testCases: [
      {
        name: 'Valid anagram pair',
        input: 's = "anagram", t = "nagaram"',
        expectedOutput: 'True',
        explanation: 'Both contain 3 \'a\'s, 1 \'n\', 1 \'g\', 1 \'r\', 1 \'m\'.',
      },
      {
        name: 'Unequal lengths early exit',
        input: 's = "rat", t = "car"',
        expectedOutput: 'False',
        explanation: '\'c\' is not present in the character counts of s.',
      },
      {
        name: 'Repeated characters mismatch',
        input: 's = "aab", t = "abb"',
        expectedOutput: 'False',
        explanation: 't consumes two \'b\'s while s only has one, causing count[\'b\'] to become negative (-1).',
      },
    ],
    commonMistakes: [
      'Checking only whether characters are present (using sets) without counting frequencies: set("aab") == set("abb"), but they are NOT anagrams.',
      'Forgetting the early length check len(s) != len(t), which leads to incomplete verification if t is a substring of s.',
    ],
    explainBackPrompt:
      'Why is it safe to omit a final scan over the dictionary if we check for count < 0 and ensure len(s) == len(t)?',
  },

  349: {
    whyOptimizedMatters:
      'The nested-loop search takes O(N × M) time. Storing the first array in a hash set enables expected O(1) membership checks, reducing the overall time to expected O(N + M) while guaranteeing distinct output.',
    pythonReferenceCode: `def intersection(nums1: list[int], nums2: list[int]) -> list[int]:
    """
    Returns unique intersection elements in expected O(N + M) time.
    """
    set1 = set(nums1)
    result = []

    for x in nums2:
        if x in set1:
            result.append(x)
            # Remove to prevent duplicates from appearing in result
            set1.remove(x)

    return result`,
    correctnessArgument:
      'Deduplication by Construction: When an element x in nums2 is found in set1, it is added to result and immediately removed from set1. Subsequent occurrences of x in nums2 will fail the `in set1` check, ensuring every element in result is strictly unique without needing a second set.',
    testCases: [
      {
        name: 'Standard intersection with duplicates',
        input: 'nums1 = [1, 2, 2, 1], nums2 = [2, 2]',
        expectedOutput: '[2]',
        explanation: 'Only value 2 is common; output contains exactly one 2.',
      },
      {
        name: 'Multiple distinct common values',
        input: 'nums1 = [4, 9, 5], nums2 = [9, 4, 9, 8, 4]',
        expectedOutput: '[9, 4] (any order)',
        explanation: 'Values 4 and 9 appear in both arrays.',
      },
      {
        name: 'Disjoint arrays',
        input: 'nums1 = [1, 2, 3], nums2 = [4, 5, 6]',
        expectedOutput: '[]',
        explanation: 'No common elements exist.',
      },
    ],
    commonMistakes: [
      'Appending directly without deduplication: returns [2, 2] instead of [2].',
      'Assuming the output must be sorted when the problem statement specifies results can be in any order.',
    ],
    explainBackPrompt:
      'Why does removing the element from set1 upon discovery eliminate the need for an auxiliary result set?',
  },

  238: {
    whyOptimizedMatters:
      'Computing total product and using division by nums[i] is explicitly forbidden and fails completely when array values are 0. Calculating prefix products from the left and suffix products from the right takes O(N) time and O(1) auxiliary space (excluding the returned array).',
    pythonReferenceCode: `def productExceptSelf(nums: list[int]) -> list[int]:
    """
    Calculates products excluding nums[i] in O(N) time and O(1) auxiliary space.
    Uses output array to store left products, then multiplies with running right product.
    """
    n = len(nums)
    answer = [1] * n

    # Pass 1: answer[i] contains the product of all elements to the left of i
    left_product = 1
    for i in range(n):
        answer[i] = left_product
        left_product *= nums[i]

    # Pass 2: Multiply by running product of all elements to the right of i
    right_product = 1
    for i in range(n - 1, -1, -1):
        answer[i] *= right_product
        right_product *= nums[i]

    return answer`,
    correctnessArgument:
      'Decomposition Invariant: For any index i, the product of all elements except nums[i] is equal to (product of elements at indices < i) × (product of elements at indices > i). Pass 1 computes the left contribution into answer[i]. Pass 2 maintains right_product and multiplies it into answer[i], producing the exact product without division.',
    testCases: [
      {
        name: 'Standard positive array',
        input: 'nums = [1, 2, 3, 4]',
        expectedOutput: '[24, 12, 8, 6]',
        explanation: 'answer[0] = 2*3*4=24, answer[1]=1*3*4=12, answer[2]=1*2*4=8, answer[3]=1*2*3=6.',
      },
      {
        name: 'Array with a single zero',
        input: 'nums = [-1, 1, 0, -3, 3]',
        expectedOutput: '[0, 0, 9, 0, 0]',
        explanation: 'Only the position containing zero has a non-zero product ((-1)*1*(-3)*3 = 9). All others include zero.',
      },
      {
        name: 'Array with multiple zeroes',
        input: 'nums = [0, 4, 0]',
        expectedOutput: '[0, 0, 0]',
        explanation: 'Every position has at least one zero in its complementary elements.',
      },
    ],
    commonMistakes: [
      'Using division: total_product / nums[i] causes ZeroDivisionError when any element is 0, and directly violates problem constraints.',
      'Allocating separate prefix and suffix arrays of size N: this uses O(N) auxiliary space, whereas storing prefix in the output array and tracking suffix with a single scalar uses O(1) auxiliary space.',
    ],
    explainBackPrompt:
      'How does storing left products directly in the output array satisfy the O(1) auxiliary space constraint?',
  },

  560: {
    whyOptimizedMatters:
      'Nested loops take O(N²) time. Sliding window fails because negative numbers destroy sum monotonicity. By using the prefix sum identity P[j] - P[i] = k => P[i] = P[j] - k, a hash map finds all matching earlier prefixes in expected O(N) time.',
    pythonReferenceCode: `def subarraySum(nums: list[int], k: int) -> int:
    """
    Counts contiguous subarrays summing to k using prefix sum + frequency map.
    Handles negative numbers, zeroes, and positive numbers uniformly.
    """
    # Base case: empty prefix before index 0 has sum 0
    freq = {0: 1}
    prefix_sum = 0
    total_subarrays = 0

    for x in nums:
        prefix_sum += x

        # If (prefix_sum - k) was observed earlier, each occurrence forms a valid subarray
        if prefix_sum - k in freq:
            total_subarrays += freq[prefix_sum - k]

        # Record current prefix sum
        freq[prefix_sum] = freq.get(prefix_sum, 0) + 1

    return total_subarrays`,
    correctnessArgument:
      'Algebraic Invariant: Let prefix[i] be the sum of nums[0..i]. The sum of nums[i+1..j] is prefix[j] - prefix[i]. For this sum to equal k, we must have prefix[i] = prefix[j] - k. By looking up freq[prefix_sum - k] before inserting prefix_sum, we count all earlier valid starting boundaries i.',
    testCases: [
      {
        name: 'Standard matching subarrays',
        input: 'nums = [1, 1, 1], k = 2',
        expectedOutput: '2',
        explanation: 'Subarrays [1, 1] at indices 0..1 and 1..2 both sum to 2.',
      },
      {
        name: 'Subarray with negative numbers',
        input: 'nums = [1, -1, 0], k = 0',
        expectedOutput: '3',
        explanation: 'Subarrays [1, -1], [0], and [1, -1, 0] all sum to 0.',
      },
      {
        name: 'Single element matching target',
        input: 'nums = [3], k = 3',
        expectedOutput: '1',
        explanation: 'prefix = 3, prefix - k = 0, matches base state {0: 1}.',
      },
    ],
    commonMistakes: [
      'Omitting the base case freq = {0: 1}: Subarrays starting at index 0 whose sum equals k will be missed.',
      'Recording whether a prefix sum exists with a boolean/set instead of counting occurrences in a frequency map (multiple distinct earlier boundaries can share the same prefix sum!).',
      'Attempting to use a two-pointer sliding window when negative numbers are present.',
    ],
    explainBackPrompt:
      'Why is it mathematically impossible for a two-pointer sliding window to solve this problem when nums contains negative numbers?',
  },

  525: {
    whyOptimizedMatters:
      'Checking all O(N²) subarrays takes quadratic time. Transforming 0 to -1 and 1 to +1 turns this into finding the longest subarray with sum 0. By recording the EARLIEST index of each balance in a hash map, we solve it in O(N) time and O(N) space.',
    pythonReferenceCode: `def findMaxLength(nums: list[int]) -> int:
    """
    Finds the maximum length of a contiguous subarray with equal 0s and 1s.
    Converts 0 -> -1 and 1 -> +1. Equal counts correspond to net balance 0.
    """
    # Base case: balance 0 occurs before the array starts (at index -1)
    earliest_seen: dict[int, int] = {0: -1}
    balance = 0
    max_len = 0

    for i, x in enumerate(nums):
        # 1 contributes +1, 0 contributes -1
        balance += 1 if x == 1 else -1

        if balance in earliest_seen:
            # Subarray between earliest_seen[balance] + 1 and i has net balance 0
            max_len = max(max_len, i - earliest_seen[balance])
        else:
            # Store only the FIRST time this balance is seen to maximize length
            earliest_seen[balance] = i

    return max_len`,
    correctnessArgument:
      'Balance Invariant: If balance at index j equals balance at earlier index i, the sum of (+1s and -1s) between index i+1 and j must be exactly 0, meaning the number of 0s equals the number of 1s. Because we never overwrite earliest_seen[balance], the length j - i is maximized.',
    testCases: [
      {
        name: 'Standard alternating sequence',
        input: 'nums = [0, 1]',
        expectedOutput: '2',
        explanation: 'Indices 0..1 contain one 0 and one 1.',
      },
      {
        name: 'Longer balanced sequence with offset',
        input: 'nums = [0, 1, 0]',
        expectedOutput: '2',
        explanation: 'Subarray [0, 1] has length 2.',
      },
      {
        name: 'All identical elements',
        input: 'nums = [0, 0, 0]',
        expectedOutput: '0',
        explanation: 'No balanced subarray exists; max_len remains 0.',
      },
    ],
    commonMistakes: [
      'Overwriting earliest_seen[balance] with current index i: this finds the SHORTEST balanced subarray instead of the LONGEST.',
      'Forgetting the initial state {0: -1}: without it, balanced subarrays that start at index 0 (e.g. [0, 1]) will have their length calculated incorrectly or missed.',
    ],
    explainBackPrompt:
      'Why is the initial base state set to {0: -1} rather than {0: 0}?',
  },

  // =========================================================================
  // DAY 3: Two Pointers & Sliding Window
  // =========================================================================
  125: {
    whyOptimizedMatters:
      'Filtering the string and creating a reversed copy takes O(N) auxiliary space. Inward two-pointers skip non-alphanumeric characters on-the-fly and compare characters directly, achieving O(N) time with strictly O(1) auxiliary space.',
    pythonReferenceCode: `def isPalindrome(s: str) -> bool:
    """
    Validates palindrome in O(N) time and O(1) space using converging two pointers.
    Skips non-alphanumeric characters on-the-fly without copying the string.
    """
    left = 0
    right = len(s) - 1

    while left < right:
        # Advance left pointer until an alphanumeric character is found
        while left < right and not s[left].isalnum():
            left += 1

        # Advance right pointer inward until an alphanumeric character is found
        while left < right and not s[right].isalnum():
            right -= 1

        # Case-insensitive character comparison
        if s[left].lower() != s[right].lower():
            return False

        left += 1
        right -= 1

    return True`,
    correctnessArgument:
      'Invariant: All alphanumeric characters at indices outside [left, right] have matched their symmetric opposites. Because left strictly increases and right strictly decreases, the interval [left, right] shrinks until left >= right, at which point the entire string has been validated as symmetric.',
    testCases: [
      {
        name: 'Standard phrase with punctuation and mixed case',
        input: 's = "A man, a plan, a canal: Panama"',
        expectedOutput: 'True',
        explanation: 'Normalized letters form "amanaplanacanalpanama", which reads identically forwards and backwards.',
      },
      {
        name: 'Non-palindrome phrase',
        input: 's = "race a car"',
        expectedOutput: 'False',
        explanation: 'Characters \'e\' and \'a\' mismatch at corresponding opposite positions.',
      },
      {
        name: 'Empty / whitespace / punctuation only',
        input: 's = "   "',
        expectedOutput: 'True',
        explanation: 'After stripping non-alphanumeric characters, the empty string reads the same forwards and backwards.',
      },
    ],
    commonMistakes: [
      'Forgetting the inner `left < right` check in the inner skip loops: causes `IndexError` when string has no alphanumeric characters.',
      'Using `re.sub()` or creating filtered arrays: works functionally but wastes O(N) heap memory instead of O(1) in-place pointers.',
    ],
    explainBackPrompt:
      'Why is the `left < right` boundary condition mandatory inside BOTH inner while loops as well as the outer while loop?',
  },

  167: {
    whyOptimizedMatters:
      'Since the array is already sorted in ascending order, opposite-direction two pointers find the unique solution in O(N) time and O(1) space, completely eliminating the O(N) memory overhead of a hash map.',
    pythonReferenceCode: `def twoSum(numbers: list[int], target: int) -> list[int]:
    left = 0
    right = len(numbers) - 1
    while left < right:
        curr_sum = numbers[left] + numbers[right]
        if curr_sum == target:
            return [left + 1, right + 1] # 1-indexed output
        elif curr_sum < target:
            left += 1
        else:
            right -= 1
    return []`,
    correctnessArgument:
      'Monotonicity: Because the array is sorted, if numbers[left] + numbers[right] < target, no element at index <= left can pair with numbers[right] to reach target, so left can be safely incremented.',
    testCases: [
      { name: 'Standard match', input: 'numbers = [2, 7, 11, 15], target = 9', expectedOutput: '[1, 2]', explanation: '2 + 7 = 9 at 1-based indices 1 and 2.' },
      { name: 'Negative numbers', input: 'numbers = [-1, 0], target = -1', expectedOutput: '[1, 2]', explanation: '-1 + 0 = -1.' },
      { name: 'Same values', input: 'numbers = [2, 3, 4], target = 6', expectedOutput: '[1, 3]', explanation: '2 + 4 = 6.' },
    ],
    commonMistakes: ['Returning 0-indexed values when the problem requires 1-indexed output.'],
    explainBackPrompt: 'Why does sorted order allow us to eliminate all pairs involving numbers[right] when curr_sum < target?',
  },

  11: {
    whyOptimizedMatters:
      'Brute-force testing all pairs of lines takes O(N²) time. Two pointers converge from outside-in in O(N) time and O(1) space by greedily moving the shorter line.',
    pythonReferenceCode: `def maxArea(height: list[int]) -> int:
    left = 0
    right = len(height) - 1
    max_water = 0
    while left < right:
        h = min(height[left], height[right])
        w = right - left
        max_water = max(max_water, h * w)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water`,
    correctnessArgument:
      'Area is limited by the shorter boundary line. Moving the taller line inward reduces width w without increasing the bounded height, guaranteeing no larger area can be formed. Only moving the shorter line can potentially find a taller line.',
    testCases: [
      { name: 'Standard variation', input: 'height = [1,8,6,2,5,4,8,3,7]', expectedOutput: '49', explanation: 'Lines at index 1 and 8 have heights 8 and 7, width 7 -> 7*7=49.' },
      { name: 'Two lines', input: 'height = [1,1]', expectedOutput: '1', explanation: 'Height 1, width 1.' },
      { name: 'Descending heights', input: 'height = [4,3,2,1,4]', expectedOutput: '16', explanation: 'First and last line both height 4, width 4 -> 16.' },
    ],
    commonMistakes: ['Moving both pointers simultaneously or moving the taller pointer inward.'],
    explainBackPrompt: 'Mathematically prove why moving the taller line can never produce a larger container area.',
  },

  15: {
    whyOptimizedMatters:
      'Finding all unique triplets summing to 0 naively takes O(N³) time. Sorting the array and fixing the first element allows two pointers to scan the remaining elements in O(N²), while sorted order makes duplicate elimination trivial.',
    pythonReferenceCode: `def threeSum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    res = []
    n = len(nums)
    for i in range(n - 2):
        if nums[i] > 0:
            break # Positive numbers cannot sum to 0
        if i > 0 and nums[i] == nums[i - 1]:
            continue # Skip duplicate first elements
        l, r = i + 1, n - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l + 1]:
                    l += 1
                while l < r and nums[r] == nums[r - 1]:
                    r -= 1
                l += 1
                r -= 1
    return res`,
    correctnessArgument:
      'After sorting, any triplet nums[i] + nums[l] + nums[r] == 0 is unique if we skip duplicate values of nums[i], nums[l], and nums[r]. Two pointers guarantee exhaustive coverage of all pairs for each fixed i in O(N) time.',
    testCases: [
      { name: 'Standard mixed list', input: 'nums = [-1,0,1,2,-1,-4]', expectedOutput: '[[-1,-1,2],[-1,0,1]]', explanation: 'Two unique triplets.' },
      { name: 'All zeroes', input: 'nums = [0,0,0]', expectedOutput: '[[0,0,0]]', explanation: 'Single zero triplet.' },
      { name: 'No possible triplet', input: 'nums = [0,1,1]', expectedOutput: '[]', explanation: 'Cannot sum to 0.' },
    ],
    commonMistakes: ['Using a set of tuples to eliminate duplicates instead of skipping duplicates in sorted order.'],
    explainBackPrompt: 'Why does nums[i] > 0 allow immediate termination of the outer loop?',
  },

  3: {
    whyOptimizedMatters:
      'Checking all substrings takes O(N³) or O(N²) time. A dynamic sliding window with a character-to-last-seen-index map finds the longest substring without repeats in a single O(N) pass.',
    pythonReferenceCode: `def lengthOfLongestSubstring(s: str) -> int:
    last_seen = {}
    left = 0
    max_len = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        max_len = max(max_len, right - left + 1)
    return max_len`,
    correctnessArgument:
      'Invariant: The window s[left..right] never contains duplicate characters. When character s[right] has been seen at index j >= left, jumping left to j + 1 restores the non-repeating invariant in O(1) time.',
    testCases: [
      { name: 'Repeating pattern', input: 's = "abcabcbb"', expectedOutput: '3', explanation: '"abc" with length 3.' },
      { name: 'Identical characters', input: 's = "bbbbb"', expectedOutput: '1', explanation: '"b" with length 1.' },
      { name: 'Overlapping substring', input: 's = "pwwkew"', expectedOutput: '3', explanation: '"wke" with length 3.' },
    ],
    commonMistakes: ['Updating left to last_seen[ch] + 1 without checking if last_seen[ch] >= left (which can erroneously move left backward).'],
    explainBackPrompt: 'Why must we verify `last_seen[ch] >= left` before updating `left`?',
  },

  209: {
    whyOptimizedMatters:
      'Because all array elements are positive, the window sum is monotonic. A sliding window finds the minimal length subarray with sum >= target in O(N) time, unlike nested loops O(N²).',
    pythonReferenceCode: `def minSubArrayLen(target: int, nums: list[int]) -> int:
    left = 0
    curr_sum = 0
    min_len = float('inf')
    for right in range(len(nums)):
        curr_sum += nums[right]
        while curr_sum >= target:
            min_len = min(min_len, right - left + 1)
            curr_sum -= nums[left]
            left += 1
    return 0 if min_len == float('inf') else min_len`,
    correctnessArgument:
      'When curr_sum >= target, the window [left..right] is valid. Shrinking left explores if a shorter valid subarray ends at right. Each pointer advances at most N times, guaranteeing O(N) total runtime.',
    testCases: [
      { name: 'Standard target match', input: 'target = 7, nums = [2,3,1,2,4,3]', expectedOutput: '2', explanation: '[4, 3] sums to 7 with length 2.' },
      { name: 'Single element match', input: 'target = 4, nums = [1,4,4]', expectedOutput: '1', explanation: '[4] has length 1.' },
      { name: 'Impossible target', input: 'target = 11, nums = [1,1,1,1]', expectedOutput: '0', explanation: 'Total sum < 11, returns 0.' },
    ],
    commonMistakes: ['Forgetting to return 0 when no subarray satisfies the target condition.'],
    explainBackPrompt: 'Why does having strictly positive integers guarantee that each pointer moves at most N times?',
  },

  // =========================================================================
  // DAY 4: Sorting & Binary Search
  // =========================================================================
  704: {
    whyOptimizedMatters:
      'Linear search requires O(N) comparisons. Binary search cuts the search space in half at each step, locating elements in O(log N) time and O(1) space.',
    pythonReferenceCode: `def search(nums: list[int], target: int) -> int:
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
    correctnessArgument:
      'Invariant: The target is guaranteed to lie in nums[left..right] if it exists. At each step, comparing nums[mid] with target eliminates either the left or right half plus mid.',
    testCases: [
      { name: 'Element present', input: 'nums = [-1,0,3,5,9,12], target = 9', expectedOutput: '4', explanation: 'Target 9 is at index 4.' },
      { name: 'Element absent', input: 'nums = [-1,0,3,5,9,12], target = 2', expectedOutput: '-1', explanation: 'Target 2 does not exist.' },
      { name: 'Single element present', input: 'nums = [5], target = 5', expectedOutput: '0', explanation: 'Index 0.' },
    ],
    commonMistakes: ['Using `left < right` instead of `left <= right`, which misses targets when the search space shrinks to a single element.'],
    explainBackPrompt: 'Why is `left + (right - left) // 2` mathematically identical to `(left + right) // 2` but safer in C++/Java?',
  },

  35: {
    whyOptimizedMatters:
      'Finds either the target index or its correct insertion point in O(log N) time and O(1) memory, establishing the foundational lower-bound binary search pattern.',
    pythonReferenceCode: `def searchInsert(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return left # Insertion position when not found`,
    correctnessArgument:
      'When target is not found, the loop terminates with left = right + 1, where left points to the smallest index whose value is strictly greater than target (or n if target is greater than all elements).',
    testCases: [
      { name: 'Target found', input: 'nums = [1,3,5,6], target = 5', expectedOutput: '2', explanation: '5 is at index 2.' },
      { name: 'Insert in middle', input: 'nums = [1,3,5,6], target = 2', expectedOutput: '1', explanation: '2 inserts before 3.' },
      { name: 'Insert at end', input: 'nums = [1,3,5,6], target = 7', expectedOutput: '4', explanation: '7 inserts after 6.' },
    ],
    commonMistakes: ['Returning mid or right instead of left when target is absent.'],
    explainBackPrompt: 'Why does `left` always point to the correct insertion position after `while left <= right` terminates?',
  },

  34: {
    whyOptimizedMatters:
      'Finding the first and last position of a target element in a sorted array with duplicates can degrade to O(N) if scanned linearly after a match. Running two separate binary searches guarantees strict O(log N) runtime.',
    pythonReferenceCode: `def searchRange(nums: list[int], target: int) -> list[int]:
    def find_bound(is_first: bool) -> int:
        left, right = 0, len(nums) - 1
        bound = -1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                bound = mid
                if is_first:
                    right = mid - 1 # Keep searching left
                else:
                    left = mid + 1  # Keep searching right
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return bound

    return [find_bound(True), find_bound(False)]`,
    correctnessArgument:
      'When nums[mid] == target, recording mid and continuing the search in the left half finds the first occurrence; continuing in the right half finds the last occurrence.',
    testCases: [
      { name: 'Multiple duplicates', input: 'nums = [5,7,7,8,8,10], target = 8', expectedOutput: '[3, 4]', explanation: 'Target 8 starts at index 3 and ends at index 4.' },
      { name: 'Target absent', input: 'nums = [5,7,7,8,8,10], target = 6', expectedOutput: '[-1, -1]', explanation: 'Not in array.' },
      { name: 'Empty array', input: 'nums = [], target = 0', expectedOutput: '[-1, -1]', explanation: 'Empty input.' },
    ],
    commonMistakes: ['Finding any target in O(log N) and then expanding left and right with linear scans (degrades to O(N) on [8, 8, 8, ...]).'],
    explainBackPrompt: 'Why does expanding left/right linearly after finding a match fail the O(log N) requirement?',
  },

  33: {
    whyOptimizedMatters:
      'A rotated sorted array can still be searched in O(log N) time because at least one half of the array across `mid` is always strictly sorted.',
    pythonReferenceCode: `def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        # Check if left half is sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        # Otherwise right half must be sorted
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1`,
    correctnessArgument:
      'In a rotated sorted array without duplicates, for any midpoint, either nums[left..mid] or nums[mid..right] is sorted. If target falls within the sorted interval, search that half; otherwise discard it.',
    testCases: [
      { name: 'Target in rotated section', input: 'nums = [4,5,6,7,0,1,2], target = 0', expectedOutput: '4', explanation: 'Index 4.' },
      { name: 'Target absent', input: 'nums = [4,5,6,7,0,1,2], target = 3', expectedOutput: '-1', explanation: 'Not present.' },
      { name: 'Single element', input: 'nums = [1], target = 0', expectedOutput: '-1', explanation: 'Not present.' },
    ],
    commonMistakes: ['Failing to check `nums[left] <= nums[mid]` with `<=` (single element half).'],
    explainBackPrompt: 'Why is at least one half of a rotated sorted array guaranteed to be strictly sorted?',
  },

  875: {
    whyOptimizedMatters:
      'Searching every possible eating speed sequentially takes O(max(piles) × N) time. Binary search on the answer space finds the minimal valid speed in O(N log(max(piles))) time.',
    pythonReferenceCode: `import math

def minEatingSpeed(piles: list[int], h: int) -> int:
    def can_finish(k: int) -> bool:
        return sum(math.ceil(p / k) for p in piles) <= h

    left, right = 1, max(piles)
    ans = right
    while left <= right:
        mid = left + (right - left) // 2
        if can_finish(mid):
            ans = mid
            right = mid - 1 # Try slower speed
        else:
            left = mid + 1  # Too slow, must speed up
    return ans`,
    correctnessArgument:
      'Predicate Monotonicity: If Koko can finish with speed k, she can also finish with any speed > k. Binary search finds the smallest k for which can_finish(k) is True.',
    testCases: [
      { name: 'Standard piles', input: 'piles = [3,6,7,11], h = 8', expectedOutput: '4', explanation: 'Speed 4 takes 1+2+2+3 = 8 hours.' },
      { name: 'Speed equals max pile', input: 'piles = [30,11,23,4,20], h = 5', expectedOutput: '30', explanation: 'Need 1 hour per pile, speed = max(piles).' },
      { name: 'Fast eating', input: 'piles = [30,11,23,4,20], h = 6', expectedOutput: '23', explanation: 'Speed 23 finishes in 6 hours.' },
    ],
    commonMistakes: ['Integer division rounding errors: must use ceil(p / k) or (p + k - 1) // k.'],
    explainBackPrompt: 'What makes binary search applicable to finding an optimal numerical parameter like speed?',
  },

  912: {
    whyOptimizedMatters:
      'Comparison-based sorting has a mathematical lower bound of O(N log N). Merge Sort guarantees O(N log N) runtime even on adversarial inputs (avoiding Quicksort\'s worst-case O(N²) degradation on sorted data) with stable ordering, using O(N) auxiliary merge buffer space.',
    pythonReferenceCode: `def sortArray(nums: list[int]) -> list[int]:
    """
    Sorts an array in O(N log N) time and O(N) auxiliary space using Merge Sort.
    Guarantees O(N log N) across all input distributions.
    """
    if len(nums) <= 1:
        return nums

    mid = len(nums) // 2
    left = sortArray(nums[:mid])
    right = sortArray(nums[mid:])

    # Merge two sorted halves
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged`,
    correctnessArgument:
      'Divide and Conquer Invariant: Base case arrays of length <= 1 are trivially sorted. In the recursive step, left and right are sorted by induction. The two-pointer merge always selects the smallest unmerged element across both halves, guaranteeing that `merged` is strictly sorted in non-decreasing order.',
    testCases: [
      { name: 'Standard mixed integers', input: 'nums = [5, 2, 3, 1]', expectedOutput: '[1, 2, 3, 5]', explanation: 'Elements sorted in non-decreasing order.' },
      { name: 'Duplicates and zeroes', input: 'nums = [5, 1, 1, 2, 0, 0]', expectedOutput: '[0, 0, 1, 1, 2, 5]', explanation: 'Handles duplicate elements stably.' },
      { name: 'Negative numbers', input: 'nums = [-4, 0, 74, 59]', expectedOutput: '[-4, 0, 59, 74]', explanation: 'Negative values sorted correctly.' },
    ],
    commonMistakes: [
      'Implementing unrandomized Quicksort: LeetCode\'s test cases include pathological inputs designed to force O(N²) time limit exceeded.',
      'Off-by-one errors when splitting intervals or slicing lists.',
    ],
    explainBackPrompt:
      'Why is Merge Sort guaranteed to achieve O(N log N) time on ALL inputs while unrandomized Quicksort can degrade to O(N²)?',
  },

  // =========================================================================
  // DAY 5: Linked Lists
  // =========================================================================
  206: {
    whyOptimizedMatters:
      'Reverses a linked list in-place using three pointers in O(N) time and O(1) space without allocating new nodes.',
    pythonReferenceCode: `def reverseList(head: ListNode | None) -> ListNode | None:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`,
    correctnessArgument:
      'Invariant: At each step, all nodes up to prev have their next pointers reversed, and curr points to the next unreversed node.',
    testCases: [
      { name: 'Five nodes', input: '1->2->3->4->5', expectedOutput: '5->4->3->2->1', explanation: 'Reversed order.' },
      { name: 'Two nodes', input: '1->2', expectedOutput: '2->1', explanation: 'Two nodes reversed.' },
      { name: 'Empty list', input: '[]', expectedOutput: '[]', explanation: 'Returns None.' },
    ],
    commonMistakes: ['Losing reference to curr.next before updating curr.next = prev.'],
    explainBackPrompt: 'Why do we need a temporary pointer `nxt` before modifying `curr.next`?',
  },

  21: {
    whyOptimizedMatters:
      'Merges two sorted linked lists by splicing node pointers in O(N + M) time and O(1) space with a dummy head node.',
    pythonReferenceCode: `def mergeTwoLists(list1: ListNode | None, list2: ListNode | None) -> ListNode | None:
    dummy = ListNode(0)
    tail = dummy
    while list1 and list2:
        if list1.val <= list2.val:
            tail.next = list1
            list1 = list1.next
        else:
            tail.next = list2
            list2 = list2.next
        tail = tail.next
    tail.next = list1 if list1 else list2
    return dummy.next`,
    correctnessArgument:
      'At each step, the smaller node is attached to tail. When one list is exhausted, the remainder of the other list is appended in O(1) time.',
    testCases: [
      { name: 'Both non-empty', input: 'l1 = [1,2,4], l2 = [1,3,4]', expectedOutput: '[1,1,2,3,4,4]', explanation: 'Sorted merge.' },
      { name: 'One empty', input: 'l1 = [], l2 = [0]', expectedOutput: '[0]', explanation: 'Appends remaining l2.' },
      { name: 'Both empty', input: 'l1 = [], l2 = []', expectedOutput: '[]', explanation: 'Returns None.' },
    ],
    commonMistakes: ['Creating new ListNode allocations instead of reusing existing list nodes.'],
    explainBackPrompt: 'How does the dummy node simplify returning the merged head?',
  },

  141: {
    whyOptimizedMatters:
      'Floyd\'s Cycle-Finding Algorithm detects cycles in O(N) time using O(1) auxiliary space, avoiding an O(N) hash set of visited node references.',
    pythonReferenceCode: `def hasCycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False`,
    correctnessArgument:
      'If a cycle exists, the distance between fast and slow reduces by 1 in each step once both are inside the cycle, guaranteeing they meet.',
    testCases: [
      { name: 'Cycle present', input: 'head = [3,2,0,-4], pos = 1', expectedOutput: 'True', explanation: 'Tail connects to node 1.' },
      { name: 'Two node cycle', input: 'head = [1,2], pos = 0', expectedOutput: 'True', explanation: 'Tail connects to node 0.' },
      { name: 'No cycle', input: 'head = [1], pos = -1', expectedOutput: 'False', explanation: 'Single node pointing to None.' },
    ],
    commonMistakes: ['Not checking `fast and fast.next` before accessing `fast.next.next`.'],
    explainBackPrompt: 'Why does fast closing the distance by 1 step per turn guarantee that it will never skip over slow?',
  },

  142: {
    whyOptimizedMatters:
      'Locates the exact start node of a cycle in O(N) time and O(1) space through Floyd\'s cycle detection and distance mathematical deduction.',
    pythonReferenceCode: `def detectCycle(head: ListNode | None) -> ListNode | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            ptr1 = head
            ptr2 = slow
            while ptr1 != ptr2:
                ptr1 = ptr1.next
                ptr2 = ptr2.next
            return ptr1
    return None`,
    correctnessArgument:
      'Let L be distance to cycle entry, C be cycle length, x be distance from entry to meeting point. 2(L+x) = L + x + kC => L = kC - x, meaning distance from head to entry equals distance from meeting point to entry.',
    testCases: [
      { name: 'Cycle at node 1', input: 'head = [3,2,0,-4], pos = 1', expectedOutput: 'Node with val 2', explanation: 'Cycle begins at index 1.' },
      { name: 'No cycle', input: 'head = [1], pos = -1', expectedOutput: 'None', explanation: 'No cycle.' },
      { name: 'Cycle at head', input: 'head = [1,2], pos = 0', expectedOutput: 'Node with val 1', explanation: 'Cycle begins at index 0.' },
    ],
    commonMistakes: ['Resetting slow to head instead of introducing a new pointer or advancing slow at speed 2.'],
    explainBackPrompt: 'Explain the mathematical relation that proves ptr1 and ptr2 meet at the cycle entry.',
  },

  19: {
    whyOptimizedMatters:
      'Removes the n-th node from the end in a single pass using two pointers separated by an n-step gap, avoiding an initial pass to count list length.',
    pythonReferenceCode: `def removeNthFromEnd(head: ListNode | None, n: int) -> ListNode | None:
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next`,
    correctnessArgument:
      'Advancing fast n+1 steps ahead of slow ensures that when fast reaches None (the end), slow is positioned immediately before the node to be removed.',
    testCases: [
      { name: 'Remove middle node', input: 'head = [1,2,3,4,5], n = 2', expectedOutput: '[1,2,3,5]', explanation: 'Node 4 removed.' },
      { name: 'Remove head node', input: 'head = [1], n = 1', expectedOutput: '[]', explanation: 'Dummy handles head removal.' },
      { name: 'Remove last node', input: 'head = [1,2], n = 1', expectedOutput: '[1]', explanation: 'Node 2 removed.' },
    ],
    commonMistakes: ['Not using a dummy node, which makes removing the head node (n == length) require special branching.'],
    explainBackPrompt: 'Why does fast advance n + 1 steps from the dummy node rather than n steps?',
  },

  2: {
    whyOptimizedMatters:
      'Digit-by-digit simulation with a carry variable processes numbers of arbitrary length without integer overflow in a single O(max(N, M)) pass, consuming O(1) auxiliary memory beyond the returned result list.',
    pythonReferenceCode: `def addTwoNumbers(l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
    """
    Adds two numbers stored as reverse linked lists in O(max(N, M)) time.
    Maintains a carry and appends sum digits to a dummy-headed result list.
    """
    dummy = ListNode(0)
    curr = dummy
    carry = 0

    while l1 is not None or l2 is not None or carry > 0:
        val1 = l1.val if l1 is not None else 0
        val2 = l2.val if l2 is not None else 0

        total = val1 + val2 + carry
        carry = total // 10
        curr.next = ListNode(total % 10)
        curr = curr.next

        if l1 is not None:
            l1 = l1.next
        if l2 is not None:
            l2 = l2.next

    return dummy.next`,
    correctnessArgument:
      'Positional Arithmetic Invariant: At step k, total = val1 + val2 + carry represents the exact sum of the k-th place digits. total % 10 is the k-th result digit and total // 10 is the carry-out to place k+1. Because digits are stored in reverse order, addition flows correctly from least to most significant place.',
    testCases: [
      { name: 'Standard addition with carry', input: 'l1 = [2, 4, 3], l2 = [5, 6, 4]', expectedOutput: '[7, 0, 8]', explanation: '342 + 465 = 807.' },
      { name: 'Zero lists', input: 'l1 = [0], l2 = [0]', expectedOutput: '[0]', explanation: '0 + 0 = 0.' },
      { name: 'Unequal lengths with cascading carry', input: 'l1 = [9, 9, 9, 9, 9, 9, 9], l2 = [9, 9, 9, 9]', expectedOutput: '[8, 9, 9, 9, 0, 0, 0, 1]', explanation: '9999999 + 9999 = 10009998.' },
    ],
    commonMistakes: [
      'Omitting the `or carry > 0` condition in the while loop: drops the final carry (e.g. 5 + 5 produces [0] instead of [0, 1]).',
      'Assuming lists are the same length without checking for None.',
    ],
    explainBackPrompt:
      'Why is it necessary to check `carry > 0` in the main while loop condition even after both input lists have reached None?',
  },

  // =========================================================================
  // DAY 6: Stacks & Queues
  // =========================================================================
  20: {
    whyOptimizedMatters:
      'Validates bracket matching and nesting in O(N) time and O(N) space using LIFO stack semantics, rejecting mismatched or unclosed brackets instantly.',
    pythonReferenceCode: `def isValid(s: str) -> bool:
    bracket_map = {')': '(', '}': '{', ']': '['}
    stack = []
    for ch in s:
        if ch in bracket_map:
            if not stack or stack[-1] != bracket_map[ch]:
                return False
            stack.pop()
        else:
            stack.append(ch)
    return len(stack) == 0`,
    correctnessArgument:
      'LIFO Invariant: Every closing bracket must pair with the most recently opened unmatched opening bracket. Checking stack[-1] enforces correct nesting.',
    testCases: [
      { name: 'Simple valid', input: 's = "()"', expectedOutput: 'True', explanation: 'Matching pair.' },
      { name: 'Nested valid', input: 's = "()[]{}"', expectedOutput: 'True', explanation: 'Multiple valid pairs.' },
      { name: 'Mismatched brackets', input: 's = "(]"', expectedOutput: 'False', explanation: 'Mismatch.' },
    ],
    commonMistakes: ['Forgetting to check `len(stack) == 0` at the end (fails on unclosed brackets like "(()").'],
    explainBackPrompt: 'Why does a stack naturally model bracket validation better than counting frequencies?',
  },

  155: {
    whyOptimizedMatters:
      'Retrieves the minimum element in strictly O(1) time without scanning by pairing each element with the minimum value observed up to that depth.',
    pythonReferenceCode: `class MinStack:
    def __init__(self):
        self.stack = [] # (val, min_so_far)

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
    correctnessArgument:
      'Prefix Minimum Invariant: The second tuple element stack[i][1] stores min(val_0, ..., val_i). Popping automatically restores the prior minimum.',
    testCases: [
      { name: 'Standard push pop getMin', input: 'push(-2), push(0), push(-3), getMin(), pop(), top(), getMin()', expectedOutput: 'getMin()=-3, top()=0, getMin()=-2', explanation: 'Restores -2 after popping -3.' },
      { name: 'Identical minimums', input: 'push(2), push(2), pop(), getMin()', expectedOutput: 'getMin()=2', explanation: 'Minimum stays 2.' },
      { name: 'Single item', input: 'push(1), getMin()', expectedOutput: '1', explanation: 'Single element.' },
    ],
    commonMistakes: ['Using a single integer min_val that is lost when the minimum element is popped.'],
    explainBackPrompt: 'Why does storing the minimum at each depth guarantee O(1) getMin even after popping the minimum?',
  },

  150: {
    whyOptimizedMatters:
      'Evaluates postfix expressions in O(N) time and O(N) space using a stack, correctly preserving operator precedence and integer truncation toward zero.',
    pythonReferenceCode: `def evalRPN(tokens: list[str]) -> int:
    stack = []
    for token in tokens:
        if token in "+-*/":
            b = stack.pop()
            a = stack.pop()
            if token == '+': stack.append(a + b)
            elif token == '-': stack.append(a - b)
            elif token == '*': stack.append(a * b)
            elif token == '/': stack.append(int(a / b)) # Truncates toward zero
        else:
            stack.append(int(token))
    return stack[0]`,
    correctnessArgument:
      'In Reverse Polish Notation, operators apply immediately to the two most recently evaluated operands, which reside at the top of the LIFO stack.',
    testCases: [
      { name: 'Simple addition and multiplication', input: '["2","1","+","3","*"]', expectedOutput: '9', explanation: '((2 + 1) * 3) = 9.' },
      { name: 'Division truncating toward zero', input: '["4","13","5","/","+"]', expectedOutput: '6', explanation: '(4 + (13 / 5)) = 4 + 2 = 6.' },
      { name: 'Negative division', input: '["10","6","9","3","+","-11","*","/","*","17","+","5","+"]', expectedOutput: '22', explanation: 'Complex expression.' },
    ],
    commonMistakes: ['Using Python `//` which floors toward -infinity; the problem specifies truncation toward zero (use `int(a / b)`).'],
    explainBackPrompt: 'Why does the second popped operand become the right-hand operand (b) rather than the left (a)?',
  },

  739: {
    whyOptimizedMatters:
      'Nested loops take O(N²) time. A monotonic decreasing stack resolves each temperature\'s warmer day in amortized O(N) time.',
    pythonReferenceCode: `def dailyTemperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    ans = [0] * n
    stack = [] # indices of decreasing temperatures
    for i, t in enumerate(temperatures):
        while stack and t > temperatures[stack[-1]]:
            prev = stack.pop()
            ans[prev] = i - prev
        stack.append(i)
    return ans`,
    correctnessArgument:
      'Monotonic Stack Invariant: Temperatures at indices in the stack are strictly decreasing. Any incoming warmer temperature pops all cooler prior days, resolving their next warmer day.',
    testCases: [
      { name: 'Standard temperatures', input: '[73,74,75,71,69,72,76,73]', expectedOutput: '[1,1,4,2,1,1,0,0]', explanation: 'Distance to warmer day.' },
      { name: 'Strictly increasing', input: '[30,40,50]', expectedOutput: '[1,1,0]', explanation: 'Every next day is warmer.' },
      { name: 'Strictly decreasing', input: '[50,40,30]', expectedOutput: '[0,0,0]', explanation: 'No warmer days exist.' },
    ],
    commonMistakes: ['Storing temperature values in the stack instead of their indices (which are needed to compute day difference `i - prev`).'],
    explainBackPrompt: 'Why does each index entering and leaving the stack at most once prove O(N) time complexity?',
  },

  232: {
    whyOptimizedMatters:
      'Implements a FIFO queue using two LIFO stacks with amortized O(1) operations by transferring elements only when the output stack is exhausted.',
    pythonReferenceCode: `class MyQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []

    def push(self, x: int) -> None:
        self.in_stack.append(x)

    def pop(self) -> int:
        self.peek()
        return self.out_stack.pop()

    def peek(self) -> int:
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
        return self.out_stack[-1]

    def empty(self) -> bool:
        return not self.in_stack and not self.out_stack`,
    correctnessArgument:
      'Reversing elements once into out_stack reverses LIFO into FIFO order. Elements are served in FIFO order until out_stack is empty.',
    testCases: [
      { name: 'Push pop peek', input: 'push(1), push(2), peek(), pop(), empty()', expectedOutput: 'peek()=1, pop()=1, empty()=False', explanation: 'FIFO order.' },
      { name: 'Empty check', input: 'push(1), pop(), empty()', expectedOutput: 'empty()=True', explanation: 'Becomes empty.' },
      { name: 'Interleaved operations', input: 'push(1), push(2), pop(), push(3), pop()', expectedOutput: 'pop()=1, pop()=2', explanation: 'Correct sequence.' },
    ],
    commonMistakes: ['Transferring elements back to in_stack after every pop (degrades amortized O(1) to O(N) per operation).'],
    explainBackPrompt: 'Explain why each element is pushed and popped at most twice, yielding amortized O(1) complexity.',
  },

  // =========================================================================
  // DAY 7: Trees & Binary Search Trees
  // =========================================================================
  104: {
    whyOptimizedMatters:
      'Finds tree depth in O(N) time and O(H) call stack memory through clean post-order bottom-up aggregation.',
    pythonReferenceCode: `def maxDepth(root: TreeNode | None) -> int:
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,
    correctnessArgument:
      'Base Case: Depth of empty tree is 0. Inductive step: Depth of tree is 1 + maximum depth of its left and right subtrees.',
    testCases: [
      { name: 'Standard tree', input: '[3,9,20,null,null,15,7]', expectedOutput: '3', explanation: 'Depth 3.' },
      { name: 'Single node', input: '[1]', expectedOutput: '1', explanation: 'Depth 1.' },
      { name: 'Empty tree', input: '[]', expectedOutput: '0', explanation: 'Depth 0.' },
    ],
    commonMistakes: ['Forgetting base case `if not root: return 0`, causing AttributeError on None.left.'],
    explainBackPrompt: 'What determines the space complexity of this recursive function on a balanced tree vs a skewed tree?',
  },

  100: {
    whyOptimizedMatters:
      'Compares two binary trees structurally and value-wise in O(min(N, M)) time using simultaneous recursive traversal.',
    pythonReferenceCode: `def isSameTree(p: TreeNode | None, q: TreeNode | None) -> bool:
    if not p and not q:
        return True
    if not p or not q or p.val != q.val:
        return False
    return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)`,
    correctnessArgument:
      'Two trees are identical iff their root values match and both left subtrees and right subtrees are identical.',
    testCases: [
      { name: 'Identical trees', input: 'p = [1,2,3], q = [1,2,3]', expectedOutput: 'True', explanation: 'Identical structure and values.' },
      { name: 'Structural mismatch', input: 'p = [1,2], q = [1,null,2]', expectedOutput: 'False', explanation: 'Different shapes.' },
      { name: 'Value mismatch', input: 'p = [1,2,1], q = [1,1,2]', expectedOutput: 'False', explanation: 'Different values.' },
    ],
    commonMistakes: ['Returning True when only one node is null.'],
    explainBackPrompt: 'Why does `if not p and not q: return True` need to be checked before `if not p or not q: return False`?',
  },

  102: {
    whyOptimizedMatters:
      'Performs BFS level-order traversal in O(N) time and O(W) space using queue size snapshotting to cleanly group levels.',
    pythonReferenceCode: `from collections import deque

def levelOrder(root: TreeNode | None) -> list[list[int]]:
    if not root:
        return []
    res = []
    q = deque([root])
    while q:
        level_size = len(q)
        level = []
        for _ in range(level_size):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res`,
    correctnessArgument:
      'Capturing level_size = len(q) at the beginning of each iteration processes exactly the current level\'s nodes before any newly enqueued children.',
    testCases: [
      { name: 'Three levels', input: '[3,9,20,null,null,15,7]', expectedOutput: '[[3],[9,20],[15,7]]', explanation: 'Grouped by level.' },
      { name: 'Single root', input: '[1]', expectedOutput: '[[1]]', explanation: 'Single level.' },
      { name: 'Empty tree', input: '[]', expectedOutput: '[]', explanation: 'Empty output.' },
    ],
    commonMistakes: ['Iterating over q without freezing len(q) at the start of the level, which mixes parents and children.'],
    explainBackPrompt: 'Why is `level_size = len(q)` necessary to separate levels?',
  },

  98: {
    whyOptimizedMatters:
      'Validates BST ordering in O(N) time and O(H) space by passing global (low, high) bounds down the recursion, avoiding the fatal flaw of checking only local children.',
    pythonReferenceCode: `def isValidBST(root: TreeNode | None) -> bool:
    def validate(node: TreeNode | None, low: float, high: float) -> bool:
        if not node:
            return True
        if not (low < node.val < high):
            return False
        return validate(node.left, low, node.val) and validate(node.right, node.val, high)
    return validate(root, float('-inf'), float('inf'))`,
    correctnessArgument:
      'Global Range Invariant: Every node must be strictly between low and high. For left child, high becomes node.val; for right child, low becomes node.val.',
    testCases: [
      { name: 'Valid BST', input: '[2,1,3]', expectedOutput: 'True', explanation: '1 < 2 < 3.' },
      { name: 'Invalid ancestor property', input: '[5,1,4,null,null,3,6]', expectedOutput: 'False', explanation: 'Node 3 in right subtree is < 5.' },
      { name: 'Duplicate values', input: '[2,2,2]', expectedOutput: 'False', explanation: 'BST requires strictly less/greater.' },
    ],
    commonMistakes: ['Checking only `root.left.val < root.val < root.right.val`, which misses violations in deeper descendant subtrees.'],
    explainBackPrompt: 'Give an example of a tree that passes local child checks but fails global BST validation.',
  },

  226: {
    whyOptimizedMatters:
      'Inverting a binary tree recursively traverses each node once, swapping left and right child pointers in O(N) time and O(H) call stack space without copying node structures.',
    pythonReferenceCode: `def invertTree(root: TreeNode | None) -> TreeNode | None:
    if not root:
        return None
    # Tuple swap prevents premature reference overwriting
    root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root`,
    correctnessArgument:
      'Inductive Invariant: After inverting the left and right subtrees recursively, swapping the root\'s left and right pointers produces the mirror image of the entire tree.',
    testCases: [
      { name: 'Full binary tree', input: '[4,2,7,1,3,6,9]', expectedOutput: '[4,7,2,9,6,3,1]', explanation: 'Every level is mirrored.' },
      { name: 'Small tree', input: '[2,1,3]', expectedOutput: '[2,3,1]', explanation: 'Children 1 and 3 swap.' },
      { name: 'Empty tree', input: '[]', expectedOutput: '[]', explanation: 'Base case returns None.' },
    ],
    commonMistakes: ['Overwriting root.left before inverting root.right without saving a temporary pointer or using tuple swap.'],
    explainBackPrompt: 'Why does Python tuple swap `root.left, root.right = invertTree(root.right), invertTree(root.left)` execute safely without losing references?',
  },

  236: {
    whyOptimizedMatters:
      'Finds Lowest Common Ancestor in O(N) time and O(H) space by recursively traversing bottom-up and identifying where targets p and q diverge.',
    pythonReferenceCode: `def lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode | None:
    if not root or root == p or root == q:
        return root
    left = lowestCommonAncestor(root.left, p, q)
    right = lowestCommonAncestor(root.right, p, q)
    if left and right:
        return root # p is in one subtree and q is in the other
    return left if left else right`,
    correctnessArgument:
      'If left and right recursive calls both return non-null, p and q reside in different subtrees of root, making root their LCA. If only one returns non-null, both reside in that subtree.',
    testCases: [
      { name: 'Split ancestors', input: 'root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1', expectedOutput: '3', explanation: 'Node 3 is the split point.' },
      { name: 'One target is ancestor of other', input: 'root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4', expectedOutput: '5', explanation: 'Node 5 is ancestor of 4.' },
      { name: 'Two node tree', input: 'root = [1,2], p = 1, q = 2', expectedOutput: '1', explanation: 'Root is 1.' },
    ],
    commonMistakes: ['Searching for node values rather than comparing node object references.'],
    explainBackPrompt: 'Why does returning `root` when `root == p or root == q` correctly handle cases where p is an ancestor of q?',
  },

  // =========================================================================
  // DAY 8: Graph Algorithms
  // =========================================================================
  1971: {
    whyOptimizedMatters:
      'DFS or BFS without visited-state handling may fail to terminate on cyclic graphs due to infinite cycles. Tracking visited states guarantees that each vertex and edge is processed at most once, achieving deterministic O(V + E) time and O(V + E) space.',
    pythonReferenceCode: `from collections import deque

def validPath(n: int, edges: list[list[int]], source: int, destination: int) -> bool:
    if source == destination:
        return True

    # 1. Build Adjacency List in O(V + E)
    adj = {i: [] for i in range(n)}
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    # 2. BFS with Visited Set
    q = deque([source])
    visited = {source}

    while q:
        curr = q.popleft()
        if curr == destination:
            return True
        for neighbor in adj[curr]:
            if neighbor not in visited:
                visited.add(neighbor)
                q.append(neighbor)

    return False`,
    correctnessArgument:
      'Visited Invariant: Every node added to visited is reachable from source. Because each vertex is enqueued at most once and each edge explored at most twice, the algorithm terminates in O(V + E) time.',
    testCases: [
      { name: 'Path exists', input: 'n = 3, edges = [[0,1],[1,2],[2,0]], source = 0, destination = 2', expectedOutput: 'True', explanation: 'Direct path exists.' },
      { name: 'Disconnected graph', input: 'n = 6, edges = [[0,1],[0,2],[3,5],[5,4],[4,3]], source = 0, destination = 5', expectedOutput: 'False', explanation: 'In different components.' },
      { name: 'Source equals destination', input: 'n = 1, edges = [], source = 0, destination = 0', expectedOutput: 'True', explanation: 'Initial check.' },
    ],
    commonMistakes: [
      'Omitting visited tracking set: causes infinite loop on cyclic graphs.',
      'Describing cyclic graph non-termination as O(V!) instead of infinite recursion / stack overflow.',
    ],
    explainBackPrompt:
      'What is the computational difference between infinite non-termination on a cyclic graph vs enumerating simple paths in a DAG?',
  },

  200: {
    whyOptimizedMatters:
      'Counting islands by flood-filling connected components runs in O(M × N) time. Mutating visited land "1" to "0" in-place saves allocating an O(M × N) visited set.',
    pythonReferenceCode: `def numIslands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    m, n = len(grid), len(grid[0])
    islands = 0

    def dfs(r: int, c: int):
        if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':
            return
        grid[r][c] = '0' # Sink land in-place
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(m):
        for c in range(n):
            if grid[r][c] == '1':
                islands += 1
                dfs(r, c)

    return islands`,
    correctnessArgument:
      'Whenever an unvisited "1" is encountered, it marks a new island. Sinking all connected land cells in 4 directions guarantees the entire connected component is visited exactly once.',
    testCases: [
      { name: 'Single large island', input: '4x5 grid with connected land', expectedOutput: '1', explanation: 'All land connected.' },
      { name: 'Three separate islands', input: 'Grid with separated clusters', expectedOutput: '3', explanation: '3 disconnected components.' },
      { name: 'All water', input: '[["0","0"],["0","0"]]', expectedOutput: '0', explanation: 'No land.' },
    ],
    commonMistakes: ['Allowing diagonal connections (problem specifies horizontal and vertical only).'],
    explainBackPrompt: 'Why does sinking visited land to "0" save memory compared to maintaining a visited set?',
  },

  207: {
    whyOptimizedMatters:
      'Detects cycles in prerequisite dependencies using Kahn\'s Algorithm (in-degree array + queue) in deterministic O(V + E) time without recursion.',
    pythonReferenceCode: `from collections import deque

def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:
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
    correctnessArgument:
      'A Directed Graph has a topological sort iff it is acyclic. Vertices in a cycle have in-degree >= 1 and can never enter the queue, so processed < numCourses proves a cycle exists.',
    testCases: [
      { name: 'Acyclic prerequisites', input: 'numCourses = 2, prerequisites = [[1, 0]]', expectedOutput: 'True', explanation: 'Can take 0 then 1.' },
      { name: 'Direct 2-node cycle', input: 'numCourses = 2, prerequisites = [[1, 0], [0, 1]]', expectedOutput: 'False', explanation: 'Cycle: 0 <-> 1.' },
      { name: 'No prerequisites', input: 'numCourses = 3, prerequisites = []', expectedOutput: 'True', explanation: 'All independent.' },
    ],
    commonMistakes: ['Reversing edge direction (prereq -> course vs course -> prereq).'],
    explainBackPrompt: 'Why does a directed cycle prevent any of its constituent nodes from reaching in-degree 0?',
  },

  785: {
    whyOptimizedMatters:
      'Determines if a graph can be 2-colored such that no adjacent vertices share a color in O(V + E) time using BFS/DFS with 2-color state tracking.',
    pythonReferenceCode: `from collections import deque

def isBipartite(graph: list[list[int]]) -> bool:
    n = len(graph)
    color = {} # node -> 0 or 1

    for start in range(n):
        if start not in color:
            color[start] = 0
            q = deque([start])
            while q:
                node = q.popleft()
                for neighbor in graph[node]:
                    if neighbor not in color:
                        color[neighbor] = 1 - color[node]
                        q.append(neighbor)
                    elif color[neighbor] == color[node]:
                        return False # Odd cycle detected
    return True`,
    correctnessArgument:
      'A graph is bipartite iff it contains no odd-length cycles. If an edge connects two nodes with the same assigned color, an odd cycle exists and the graph is not bipartite.',
    testCases: [
      { name: 'Even cycle (bipartite)', input: 'graph = [[1,3],[0,2],[1,3],[0,2]]', expectedOutput: 'True', explanation: '4-node square cycle.' },
      { name: 'Odd cycle (non-bipartite)', input: 'graph = [[1,2,3],[0,2],[0,1,3],[0,2]]', expectedOutput: 'False', explanation: 'Contains triangle 0-1-2.' },
      { name: 'Disconnected graph', input: 'graph = [[],[2,4,6],[1,4,8,9],[7,8],...]', expectedOutput: 'True/False per components', explanation: 'Handles multiple components.' },
    ],
    commonMistakes: ['Traversing only component 0 instead of looping over all vertices to handle disconnected graph components.'],
    explainBackPrompt: 'Why must we loop over `range(n)` rather than simply starting BFS from node 0?',
  },

  994: {
    whyOptimizedMatters:
      'Multi-source BFS models simultaneous disease/rot propagation layer-by-layer in O(M × N) time and O(M × N) space, correctly finding the minimum elapsed minutes.',
    pythonReferenceCode: `from collections import deque

def orangesRotting(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    queue = deque()
    fresh = 0

    for r in range(m):
        for c in range(n):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1

    if fresh == 0:
        return 0

    minutes = 0
    directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]

    while queue and fresh > 0:
        minutes += 1
        for _ in range(len(queue)):
            r, c = queue.popleft()
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))

    return minutes if fresh == 0 else -1`,
    correctnessArgument:
      'Multi-Source BFS Invariant: At minute t, all oranges at Manhattan distance <= t from any initial rotten orange have rotted. The queue processes oranges layer-by-layer in time.',
    testCases: [
      { name: 'Standard multi-minute rot', input: 'grid = [[2,1,1],[1,1,0],[0,1,1]]', expectedOutput: '4', explanation: 'All fresh oranges rot in 4 minutes.' },
      { name: 'Unreachable fresh orange', input: 'grid = [[2,1,1],[0,1,1],[1,0,1]]', expectedOutput: '-1', explanation: 'Orange at (2,0) cannot be reached.' },
      { name: 'No fresh oranges initially', input: 'grid = [[0,2]]', expectedOutput: '0', explanation: '0 fresh oranges, returns 0.' },
    ],
    commonMistakes: ['Running individual BFS from each rotten orange separately instead of a multi-source BFS starting with all rotten oranges in the queue together.'],
    explainBackPrompt: 'Why does enqueuing all initially rotten oranges together before the loop begins ensure simultaneous 1-minute layer expansion?',
  },

  743: {
    whyOptimizedMatters:
      'Finds the time for a network signal to reach all nodes from source k using Dijkstra\'s Algorithm with a min-heap priority queue in O((V + E) log V) time.',
    pythonReferenceCode: `import heapq

def networkDelayTime(times: list[list[int]], n: int, k: int) -> int:
    adj = {i: [] for i in range(1, n + 1)}
    for u, v, w in times:
        adj[u].append((v, w))

    # Min-heap storing (distance, node)
    pq = [(0, k)]
    dist = {}

    while pq:
        d, u = heapq.heappop(pq)
        if u in dist:
            continue
        dist[u] = d
        for v, w in adj[u]:
            if v not in dist:
                heapq.heappush(pq, (d + w, v))

    return max(dist.values()) if len(dist) == n else -1`,
    correctnessArgument:
      'Because all edge weights are non-negative, greedily extracting the node with minimum tentative distance guarantees its shortest distance is finalized.',
    testCases: [
      { name: 'All reachable', input: 'times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2', expectedOutput: '2', explanation: 'Reaches all in 2 seconds.' },
      { name: 'Single edge', input: 'times = [[1,2,1]], n = 2, k = 1', expectedOutput: '1', explanation: 'Takes 1 second.' },
      { name: 'Unreachable node', input: 'times = [[1,2,1]], n = 2, k = 2', expectedOutput: '-1', explanation: 'Node 1 unreachable from node 2.' },
    ],
    commonMistakes: [
      'Using Dijkstra on graphs with negative weights (requires Bellman-Ford).',
      'Forgetting to check `if u in dist: continue` when extracting from the heap, which causes redundant processing of outdated distances.',
    ],
    explainBackPrompt: 'Why does Dijkstra\'s algorithm require all edge weights to be non-negative?',
  },
};
