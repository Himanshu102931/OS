#!/usr/bin/env python3
"""
PlacementOS — 8-Day DSA Challenge Python Reference Solution Validator

Executes all 40 guided reference solutions extracted from src/data/dsaGuidedSolutions.ts
against multi-case unit tests using isolated data structure fixtures.

Usage:
    python scripts/test_dsa_solutions.py
    py scripts/test_dsa_solutions.py
"""

import ast
from collections import deque
import heapq
import math
import os
import re
import sys

# Resolve path portably relative to this script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TS_FILE = os.path.normpath(os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'dsaGuidedSolutions.ts'))

if not os.path.isfile(TS_FILE):
    print(f"ERROR: Cannot find solutions file at: {TS_FILE}")
    sys.exit(1)

with open(TS_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract code blocks
pattern = re.compile(
    r"(\d+):\s*\{[\s\S]*?pythonReferenceCode:\s*`([\s\S]*?)`,\s*correctnessArgument:",
    re.MULTILINE
)
matches = pattern.findall(content)
solutions = {int(num): code for num, code in matches}

# Fixtures for Linked Lists and Binary Trees
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(vals):
    if not vals:
        return None
    dummy = ListNode(0)
    curr = dummy
    for v in vals:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next

def list_to_array(head):
    res = []
    curr = head
    visited = set()
    while curr:
        if id(curr) in visited:
            raise ValueError("Infinite cycle detected in list_to_array")
        visited.add(id(curr))
        res.append(curr.val)
        curr = curr.next
    return res

def build_cyclic_list(vals, pos):
    if not vals:
        return None
    nodes = [ListNode(v) for v in vals]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if 0 <= pos < len(nodes):
        nodes[-1].next = nodes[pos]
    return nodes[0]

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(vals):
    if not vals:
        return None
    root = TreeNode(vals[0])
    queue = deque([root])
    i = 1
    while queue and i < len(vals):
        node = queue.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            queue.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            queue.append(node.right)
        i += 1
    return root

def tree_to_level_order(root):
    if not root:
        return []
    res = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        if node:
            res.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

# ---------------------------------------------------------------------------
# Test definitions for all 40 guided problems
# ---------------------------------------------------------------------------

# DAY 1: Logic Building, Complexity & Arrays
def test_344(s):
    f = s["reverseString"]
    a = ["h", "e", "l", "l", "o"]
    f(a)
    assert a == ["o", "l", "l", "e", "h"]
    b = ["H", "a", "n", "n", "a", "h"]
    f(b)
    assert b == ["h", "a", "n", "n", "a", "H"]
    c = ["x"]
    f(c)
    assert c == ["x"]

def test_414(s):
    f = s["thirdMax"]
    assert f([3, 2, 1]) == 1
    assert f([1, 2]) == 2
    assert f([2, 2, 3, 1]) == 1
    assert f([1, 2, -2147483648]) == -2147483648

def test_283(s):
    f = s["moveZeroes"]
    a = [0, 1, 0, 3, 12]
    f(a)
    assert a == [1, 3, 12, 0, 0]
    b = [0]
    f(b)
    assert b == [0]
    c = [1, 2, 3]
    f(c)
    assert c == [1, 2, 3]

def test_1(s):
    f = s["twoSum"]
    assert f([2, 7, 11, 15], 9) == [0, 1]
    assert f([3, 2, 4], 6) == [1, 2]
    assert f([3, 3], 6) == [0, 1]

def test_121(s):
    f = s["maxProfit"]
    assert f([7, 1, 5, 3, 6, 4]) == 5
    assert f([7, 6, 4, 3, 1]) == 0
    assert f([2, 4, 1]) == 2

# DAY 2: Hashing & Prefix-Based Reasoning
def test_242(s):
    f = s["isAnagram"]
    assert f("anagram", "nagaram") is True
    assert f("rat", "car") is False
    assert f("a", "ab") is False

def test_349(s):
    f = s["intersection"]
    assert f([1, 2, 2, 1], [2, 2]) == [2]
    assert set(f([4, 9, 5], [9, 4, 9, 8, 4])) == {4, 9}
    assert f([1, 2, 3], [4, 5, 6]) == []

def test_238(s):
    f = s["productExceptSelf"]
    assert f([1, 2, 3, 4]) == [24, 12, 8, 6]
    assert f([-1, 1, 0, -3, 3]) == [0, 0, 9, 0, 0]
    assert f([0, 0]) == [0, 0]

def test_560(s):
    f = s["subarraySum"]
    assert f([1, 1, 1], 2) == 2
    assert f([1, 2, 3], 3) == 2
    assert f([1, -1, 0], 0) == 3

def test_525(s):
    f = s["findMaxLength"]
    assert f([0, 1]) == 2
    assert f([0, 1, 0]) == 2
    assert f([0, 1, 1, 0, 1, 1, 1, 0]) == 4

# DAY 3: Two Pointers & Sliding Window
def test_125(s):
    f = s["isPalindrome"]
    assert f("A man, a plan, a canal: Panama") is True
    assert f("race a car") is False
    assert f(" ") is True
    assert f("0P") is False

def test_11(s):
    f = s["maxArea"]
    assert f([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49
    assert f([1, 1]) == 1
    assert f([4, 3, 2, 1, 4]) == 16

def test_15(s):
    f = s["threeSum"]
    r1 = [sorted(x) for x in f([-1, 0, 1, 2, -1, -4])]
    assert sorted(r1) == [[-1, -1, 2], [-1, 0, 1]]
    assert f([0, 1, 1]) == []
    assert f([0, 0, 0]) == [[0, 0, 0]]

def test_209(s):
    f = s["minSubArrayLen"]
    assert f(7, [2, 3, 1, 2, 4, 3]) == 2
    assert f(4, [1, 4, 4]) == 1
    assert f(11, [1, 1, 1, 1]) == 0

def test_3(s):
    f = s["lengthOfLongestSubstring"]
    assert f("abcabcbb") == 3
    assert f("bbbbb") == 1
    assert f("pwwkew") == 3
    assert f("") == 0

# DAY 4: Sorting & Binary Search
def test_704(s):
    f = s["search"]
    assert f([-1, 0, 3, 5, 9, 12], 9) == 4
    assert f([-1, 0, 3, 5, 9, 12], 2) == -1
    assert f([5], 5) == 0

def test_35(s):
    f = s["searchInsert"]
    assert f([1, 3, 5, 6], 5) == 2
    assert f([1, 3, 5, 6], 2) == 1
    assert f([1, 3, 5, 6], 7) == 4
    assert f([1, 3, 5, 6], 0) == 0

def test_34(s):
    f = s["searchRange"]
    assert f([5, 7, 7, 8, 8, 10], 8) == [3, 4]
    assert f([5, 7, 7, 8, 8, 10], 6) == [-1, -1]
    assert f([], 0) == [-1, -1]
    assert f([1], 1) == [0, 0]

def test_33(s):
    f = s["search"]
    assert f([4, 5, 6, 7, 0, 1, 2], 0) == 4
    assert f([4, 5, 6, 7, 0, 1, 2], 3) == -1
    assert f([1], 0) == -1
    assert f([3, 1], 1) == 1

def test_912(s):
    f = s["sortArray"]
    assert f([5, 2, 3, 1]) == [1, 2, 3, 5]
    assert f([5, 1, 1, 2, 0, 0]) == [0, 0, 1, 1, 2, 5]
    assert f([-4, 0, 74, 59]) == [-4, 0, 59, 74]

# DAY 5: Linked Lists
def test_206(s):
    f = s["reverseList"]
    l1 = build_list([1, 2, 3, 4, 5])
    assert list_to_array(f(l1)) == [5, 4, 3, 2, 1]
    l2 = build_list([1, 2])
    assert list_to_array(f(l2)) == [2, 1]
    assert f(None) is None

def test_21(s):
    f = s["mergeTwoLists"]
    l1 = build_list([1, 2, 4])
    l2 = build_list([1, 3, 4])
    assert list_to_array(f(l1, l2)) == [1, 1, 2, 3, 4, 4]
    assert f(None, None) is None
    l3 = build_list([0])
    assert list_to_array(f(None, l3)) == [0]

def test_141(s):
    f = s["hasCycle"]
    c1 = build_cyclic_list([3, 2, 0, -4], 1)
    assert f(c1) is True
    c2 = build_cyclic_list([1, 2], 0)
    assert f(c2) is True
    c3 = build_cyclic_list([1], -1)
    assert f(c3) is False
    assert f(None) is False

def test_19(s):
    f = s["removeNthFromEnd"]
    l1 = build_list([1, 2, 3, 4, 5])
    assert list_to_array(f(l1, 2)) == [1, 2, 3, 5]
    l2 = build_list([1])
    assert list_to_array(f(l2, 1)) == []
    l3 = build_list([1, 2])
    assert list_to_array(f(l3, 1)) == [1]

def test_2(s):
    f = s["addTwoNumbers"]
    l1 = build_list([2, 4, 3])
    l2 = build_list([5, 6, 4])
    assert list_to_array(f(l1, l2)) == [7, 0, 8]
    l3 = build_list([0])
    l4 = build_list([0])
    assert list_to_array(f(l3, l4)) == [0]
    l5 = build_list([9, 9, 9, 9, 9, 9, 9])
    l6 = build_list([9, 9, 9, 9])
    assert list_to_array(f(l5, l6)) == [8, 9, 9, 9, 0, 0, 0, 1]

# DAY 6: Stacks & Queues
def test_20(s):
    f = s["isValid"]
    assert f("()") is True
    assert f("()[]{}") is True
    assert f("(]") is False
    assert f("([)]") is False
    assert f("{[]}") is True

def test_155(s):
    MinStack = s["MinStack"]
    ms = MinStack()
    ms.push(-2)
    ms.push(0)
    ms.push(-3)
    assert ms.getMin() == -3
    ms.pop()
    assert ms.top() == 0
    assert ms.getMin() == -2

def test_150(s):
    f = s["evalRPN"]
    assert f(["2", "1", "+", "3", "*"]) == 9
    assert f(["4", "13", "5", "/", "+"]) == 6
    assert f(["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]) == 22

def test_739(s):
    f = s["dailyTemperatures"]
    assert f([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]
    assert f([30, 40, 50, 60]) == [1, 1, 1, 0]
    assert f([30, 60, 90]) == [1, 1, 0]

def test_232(s):
    MyQueue = s["MyQueue"]
    q = MyQueue()
    q.push(1)
    q.push(2)
    assert q.peek() == 1
    assert q.pop() == 1
    assert q.empty() is False
    assert q.pop() == 2
    assert q.empty() is True

# DAY 7: Trees & Binary Search Trees
def test_104(s):
    f = s["maxDepth"]
    t1 = build_tree([3, 9, 20, None, None, 15, 7])
    assert f(t1) == 3
    t2 = build_tree([1, None, 2])
    assert f(t2) == 2
    assert f(None) == 0

def test_100(s):
    f = s["isSameTree"]
    t1 = build_tree([1, 2, 3])
    t2 = build_tree([1, 2, 3])
    assert f(t1, t2) is True
    t3 = build_tree([1, 2])
    t4 = build_tree([1, None, 2])
    assert f(t3, t4) is False

def test_226(s):
    f = s["invertTree"]
    t1 = build_tree([4, 2, 7, 1, 3, 6, 9])
    assert tree_to_level_order(f(t1)) == [4, 7, 2, 9, 6, 3, 1]
    t2 = build_tree([2, 1, 3])
    assert tree_to_level_order(f(t2)) == [2, 3, 1]
    assert f(None) is None

def test_102(s):
    f = s["levelOrder"]
    t1 = build_tree([3, 9, 20, None, None, 15, 7])
    assert f(t1) == [[3], [9, 20], [15, 7]]
    t2 = build_tree([1])
    assert f(t2) == [[1]]
    assert f(None) == []

def test_98(s):
    f = s["isValidBST"]
    t1 = build_tree([2, 1, 3])
    assert f(t1) is True
    t2 = build_tree([5, 1, 4, None, None, 3, 6])
    assert f(t2) is False
    t3 = build_tree([2, 2, 2])
    assert f(t3) is False
    t4 = build_tree([5, 4, 6, None, None, 3, 7])
    assert f(t4) is False

# DAY 8: Graph Algorithms
def test_1971(s):
    f = s["validPath"]
    assert f(3, [[0, 1], [1, 2], [2, 0]], 0, 2) is True
    assert f(6, [[0, 1], [0, 2], [3, 5], [5, 4], [4, 3]], 0, 5) is False
    assert f(1, [], 0, 0) is True

def test_200(s):
    f = s["numIslands"]
    g1 = [
        ["1", "1", "1", "1", "0"],
        ["1", "1", "0", "1", "0"],
        ["1", "1", "0", "0", "0"],
        ["0", "0", "0", "0", "0"],
    ]
    assert f(g1) == 1
    g2 = [
        ["1", "1", "0", "0", "0"],
        ["1", "1", "0", "0", "0"],
        ["0", "0", "1", "0", "0"],
        ["0", "0", "0", "1", "1"],
    ]
    assert f(g2) == 3

def test_207(s):
    f = s["canFinish"]
    assert f(2, [[1, 0]]) is True
    assert f(2, [[1, 0], [0, 1]]) is False
    assert f(3, [[0, 1], [0, 2], [1, 2]]) is True

def test_994(s):
    f = s["orangesRotting"]
    assert f([[2, 1, 1], [1, 1, 0], [0, 1, 1]]) == 4
    assert f([[2, 1, 1], [0, 1, 1], [1, 0, 1]]) == -1
    assert f([[0, 2]]) == 0

def test_743(s):
    f = s["networkDelayTime"]
    assert f([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2) == 2
    assert f([[1, 2, 1]], 2, 1) == 1
    assert f([[1, 2, 1]], 2, 2) == -1

ALL_TESTS = [
    # Day 1
    (344, "Reverse String", test_344),
    (414, "Third Maximum Number", test_414),
    (283, "Move Zeroes", test_283),
    (1, "Two Sum", test_1),
    (121, "Best Time to Buy and Sell Stock", test_121),
    # Day 2
    (242, "Valid Anagram", test_242),
    (349, "Intersection of Two Arrays", test_349),
    (238, "Product of Array Except Self", test_238),
    (560, "Subarray Sum Equals K", test_560),
    (525, "Contiguous Array", test_525),
    # Day 3
    (125, "Valid Palindrome", test_125),
    (11, "Container With Most Water", test_11),
    (15, "3Sum", test_15),
    (209, "Minimum Size Subarray Sum", test_209),
    (3, "Longest Substring Without Repeating Characters", test_3),
    # Day 4
    (704, "Binary Search", test_704),
    (35, "Search Insert Position", test_35),
    (34, "Find First and Last Position", test_34),
    (33, "Search in Rotated Sorted Array", test_33),
    (912, "Sort an Array", test_912),
    # Day 5
    (206, "Reverse Linked List", test_206),
    (21, "Merge Two Sorted Lists", test_21),
    (141, "Linked List Cycle", test_141),
    (19, "Remove Nth Node From End of List", test_19),
    (2, "Add Two Numbers", test_2),
    # Day 6
    (20, "Valid Parentheses", test_20),
    (155, "Min Stack", test_155),
    (150, "Evaluate Reverse Polish Notation", test_150),
    (739, "Daily Temperatures", test_739),
    (232, "Implement Queue using Stacks", test_232),
    # Day 7
    (104, "Maximum Depth of Binary Tree", test_104),
    (100, "Same Tree", test_100),
    (226, "Invert Binary Tree", test_226),
    (102, "Binary Tree Level Order Traversal", test_102),
    (98, "Validate Binary Search Tree", test_98),
    # Day 8
    (1971, "Find if Path Exists in Graph", test_1971),
    (200, "Number of Islands", test_200),
    (207, "Course Schedule", test_207),
    (994, "Rotting Oranges", test_994),
    (743, "Network Delay Time", test_743),
]

def main():
    print("=" * 68)
    print("PlacementOS — 8-Day DSA Challenge: 40 Python Solutions Test Suite")
    print("=" * 68)

    passed = 0
    failed = 0

    for num, name, test_func in ALL_TESTS:
        code = solutions.get(num)
        if not code:
            print(f"  [MISSING] LC #{num:4d} {name}")
            failed += 1
            continue

        scope = {
            "ListNode": ListNode,
            "TreeNode": TreeNode,
            "math": math,
            "deque": deque,
            "heapq": heapq,
            "List": list,
            "Dict": dict,
            "Set": set,
            "Tuple": tuple,
            "Optional": object,
        }

        try:
            ast.parse(code)
            exec(code, scope)
            test_func(scope)
            passed += 1
            print(f"  [PASS] LC #{num:4d} : {name}")
        except Exception as e:
            failed += 1
            print(f"  [FAIL] LC #{num:4d} : {name} -> {type(e).__name__}: {e}")

    print("=" * 68)
    print(f"EXECUTION SUMMARY: {passed} PASSED, {failed} FAILED (Total: {len(ALL_TESTS)})")
    print("=" * 68)

    if failed > 0:
        sys.exit(1)
    else:
        print("ALL 40 PYTHON REFERENCE SOLUTIONS VALIDATED SUCCESSFULLY!")
        sys.exit(0)

if __name__ == "__main__":
    main()
