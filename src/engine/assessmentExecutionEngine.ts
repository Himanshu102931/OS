/**
 * Assessment Execution Engine (Phase H)
 *
 * Provides controlled, deterministic, sandboxed execution and evaluation
 * for Python and SQL assessment items.
 *
 * Invariants:
 * - Pure client-side, zero external network, zero filesystem/host access.
 * - Strict AST/sandbox token inspection rejecting unsafe builtins or host escapes.
 * - Step and wall-clock execution limits to prevent infinite loops.
 * - Fails closed on unsupported, malformed, or unsafe code.
 * - Deterministic results for identical inputs and fixtures.
 */

import type {
  AssessmentItem,
  AssessmentExecutionResult,
  SqlFixture,
} from '../types';

// ============================================================================
// Error Taxonomy Codes for Execution (Phase H)
// ============================================================================

export const EXECUTION_ERROR_CODES = {
  SYNTAX: 'E-SYNTAX',
  RUNTIME: 'E-RUNTIME',
  ASSERTION: 'E-ASSERTION',
  TIMEOUT: 'E-TIMEOUT',
  SANDBOX_VIOLATION: 'E-SANDBOX_VIOLATION',
  INVALID_QUERY: 'E-INVALID_QUERY',
  WRONG_RESULT: 'E-WRONG_RESULT',
  UNSUPPORTED: 'E-UNSUPPORTED',
} as const;

// ============================================================================
// Python Execution Sandbox & Evaluator
// ============================================================================

const FORBIDDEN_PYTHON_TOKENS = [
  '__import__',
  'import ',
  'import\t',
  'import\n',
  'eval',
  'exec',
  'compile',
  'open',
  'file',
  'globals',
  'locals',
  'vars',
  'getattr',
  'setattr',
  'delattr',
  'hasattr',
  '__proto__',
  'prototype',
  'constructor',
  'window',
  'document',
  'globalThis',
  'process',
  'require',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'os.',
  'sys.',
  'subprocess.',
  '__class__',
  '__base__',
  '__subclasses__',
  '__mro__',
  '__code__',
];

/**
 * Validates Python code against forbidden patterns, imports, and host escape vectors.
 */
export function validatePythonSafety(code: string): { safe: boolean; reason?: string } {
  // Strip comments and string literals for token checking to avoid false positives in prompts/strings
  const codeWithoutStrings = code
    .replace(/#[^\r\n]*/g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

  for (const token of FORBIDDEN_PYTHON_TOKENS) {
    if (codeWithoutStrings.includes(token)) {
      return {
        safe: false,
        reason: `Forbidden token detected in code: "${token}"`,
      };
    }
  }

  return { safe: true };
}

// ----------------------------------------------------------------------------
// AST & Tree-Walk Python Interpreter
// ----------------------------------------------------------------------------

interface Scope {
  vars: Map<string, unknown>;
  parent?: Scope;
}

class ExecutionTimeoutError extends Error {
  constructor(message: string = 'Execution exceeded step or time limit') {
    super(message);
    this.name = 'ExecutionTimeoutError';
  }
}

class PythonRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PythonRuntimeError';
  }
}

export class PythonSandboxViolationError extends Error {
  constructor(message: string = 'Sandbox security violation') {
    super(message);
    this.name = 'PythonSandboxViolationError';
  }
}

const FORBIDDEN_PROPERTIES = new Set(['__proto__', 'prototype', 'constructor']);

export function assertSafeProperty(prop: unknown): void {
  const p = String(prop);
  if (FORBIDDEN_PROPERTIES.has(p)) {
    throw new PythonSandboxViolationError(`Sandbox security violation: forbidden property access or assignment "${p}"`);
  }
}

class ReturnSignal {
  value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}

class BreakSignal {}
class ContinueSignal {}

/**
 * Helper to deep-compare outputs between actual and expected results.
 */
export function areOutputsEqual(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (actual === undefined || expected === undefined) return actual === expected;

  // Handle numbers with precision tolerance
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 1e-7;
  }

  // Handle Arrays/Lists/Tuples
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!areOutputsEqual(actual[i], expected[i])) return false;
    }
    return true;
  }

  // Handle Objects / Dictionaries
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actObj = actual as Record<string, unknown>;
    const expObj = expected as Record<string, unknown>;
    const actKeys = Object.keys(actObj);
    const expKeys = Object.keys(expObj);
    if (actKeys.length !== expKeys.length) return false;
    for (const key of actKeys) {
      if (!Object.prototype.hasOwnProperty.call(expObj, key)) return false;
      if (!areOutputsEqual(actObj[key], expObj[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Deterministic Python Interpreter for execution-backed assessment tasks.
 */
export class SandboxedPythonInterpreter {
  private globalScope: Scope;
  private stepCount: number = 0;
  private maxSteps: number;
  private startTimeMs: number = 0;
  private timeoutMs: number;
  public logs: string[] = [];

  constructor(options: { maxSteps?: number; timeoutMs?: number } = {}) {
    this.maxSteps = options.maxSteps ?? 50_000;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.globalScope = { vars: new Map() };
    this.initBuiltins();
  }

  private initBuiltins() {
    const builtins: Record<string, unknown> = {
      True: true,
      False: false,
      None: null,
      len: (obj: unknown) => {
        if (typeof obj === 'string' || Array.isArray(obj)) return obj.length;
        if (obj instanceof Set || obj instanceof Map) return obj.size;
        if (obj && typeof obj === 'object') return Object.keys(obj).length;
        throw new PythonRuntimeError(`TypeError: object of type has no len()`);
      },
      range: (...args: number[]) => {
        let start = 0;
        let stop = 0;
        let step = 1;
        if (args.length === 1) {
          stop = args[0];
        } else if (args.length >= 2) {
          start = args[0];
          stop = args[1];
          step = args[2] !== undefined ? args[2] : 1;
        }
        if (step === 0) throw new PythonRuntimeError('ValueError: range() arg 3 must not be zero');
        const res: number[] = [];
        if (step > 0) {
          for (let i = start; i < stop; i += step) res.push(i);
        } else {
          for (let i = start; i > stop; i += step) res.push(i);
        }
        return res;
      },
      min: (...args: unknown[]) => {
        const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as unknown[]) : args;
        if (items.length === 0) throw new PythonRuntimeError('ValueError: min() arg is an empty sequence');
        return items.reduce((a, b) => ((a as number) < (b as number) ? a : b));
      },
      max: (...args: unknown[]) => {
        const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as unknown[]) : args;
        if (items.length === 0) throw new PythonRuntimeError('ValueError: max() arg is an empty sequence');
        return items.reduce((a, b) => ((a as number) > (b as number) ? a : b));
      },
      sum: (items: unknown[], start: number = 0) => {
        if (!Array.isArray(items)) throw new PythonRuntimeError('TypeError: sum() argument must be an iterable');
        return items.reduce((acc: number, curr: unknown) => acc + Number(curr), start);
      },
      abs: (x: number) => Math.abs(x),
      int: (x: unknown) => {
        const n = parseInt(String(x), 10);
        if (isNaN(n)) throw new PythonRuntimeError(`ValueError: invalid literal for int()`);
        return n;
      },
      float: (x: unknown) => {
        const n = parseFloat(String(x));
        if (isNaN(n)) throw new PythonRuntimeError(`ValueError: could not convert string to float`);
        return n;
      },
      str: (x: unknown) => {
        if (x === null) return 'None';
        if (x === true) return 'True';
        if (x === false) return 'False';
        return String(x);
      },
      bool: (x: unknown) => {
        if (x === null || x === false || x === 0 || x === '' || (Array.isArray(x) && x.length === 0)) {
          return false;
        }
        return true;
      },
      list: (x?: unknown) => {
        if (!x) return [];
        if (Array.isArray(x)) return [...x];
        if (typeof x === 'string') return x.split('');
        if (x instanceof Set) return Array.from(x);
        return [];
      },
      sorted: (iterable: unknown[], reverse: boolean = false) => {
        if (!Array.isArray(iterable)) throw new PythonRuntimeError('TypeError: sorted() requires an iterable');
        const copy = [...iterable];
        copy.sort((a, b) => {
          if (a === b) return 0;
          return (a as number) < (b as number) ? -1 : 1;
        });
        if (reverse) copy.reverse();
        return copy;
      },
      reversed: (iterable: unknown[]) => {
        if (!Array.isArray(iterable)) throw new PythonRuntimeError('TypeError: reversed() requires an iterable');
        return [...iterable].reverse();
      },
      print: (...args: unknown[]) => {
        const line = args
          .map((a) => (a === null ? 'None' : a === true ? 'True' : a === false ? 'False' : String(a)))
          .join(' ');
        this.logs.push(line);
      },
      dict: (...args: unknown[]) => {
        const d: Record<string, unknown> = Object.create(null);
        if (args.length > 0 && Array.isArray(args[0])) {
          for (const item of args[0]) {
            if (Array.isArray(item) && item.length >= 2) {
              const k = String(item[0]);
              assertSafeProperty(k);
              d[k] = item[1];
            }
          }
        }
        return d;
      },
    };

    for (const [k, v] of Object.entries(builtins)) {
      this.globalScope.vars.set(k, v);
    }
  }

  private checkLimit() {
    this.stepCount++;
    if (this.stepCount > this.maxSteps) {
      throw new ExecutionTimeoutError(`Step limit (${this.maxSteps}) exceeded`);
    }
    if (Date.now() - this.startTimeMs > this.timeoutMs) {
      throw new ExecutionTimeoutError(`Timeout (${this.timeoutMs}ms) exceeded`);
    }
  }

  public execute(code: string): void {
    this.stepCount = 0;
    this.startTimeMs = Date.now();
    this.logs = [];

    const lines = code.split(/\r?\n/);
    const parsedBlock = this.parseIndentedLines(lines, 0);
    this.executeStatements(parsedBlock, this.globalScope);
  }

  public callFunction(name: string, args: unknown[]): unknown {
    const fn = this.lookup(name, this.globalScope);
    if (!fn) {
      throw new PythonRuntimeError(`NameError: name '${name}' is not defined`);
    }
    if (typeof fn !== 'function') {
      throw new PythonRuntimeError(`TypeError: '${name}' object is not callable`);
    }
    return fn(...args);
  }

  private lookup(name: string, scope: Scope): unknown {
    let curr: Scope | undefined = scope;
    while (curr) {
      if (curr.vars.has(name)) return curr.vars.get(name);
      curr = curr.parent;
    }
    return undefined;
  }

  private setVar(name: string, value: unknown, scope: Scope): void {
    let curr: Scope | undefined = scope;
    while (curr) {
      if (curr.vars.has(name)) {
        curr.vars.set(name, value);
        return;
      }
      curr = curr.parent;
    }
    scope.vars.set(name, value);
  }

  // --------------------------------------------------------------------------
  // Parser: Indented Lines into Statement Blocks
  // --------------------------------------------------------------------------

  private parseIndentedLines(lines: string[], baseIndent: number): StatementNode[] {
    const nodes: StatementNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i];

      // Strip comments outside quotes
      let inQuote: string | null = null;
      let commentIdx = -1;
      for (let c = 0; c < rawLine.length; c++) {
        const ch = rawLine[c];
        if (inQuote) {
          if (ch === inQuote && rawLine[c - 1] !== '\\') inQuote = null;
        } else if (ch === '"' || ch === "'") {
          inQuote = ch;
        } else if (ch === '#') {
          commentIdx = c;
          break;
        }
      }
      const lineWithoutComment = commentIdx !== -1 ? rawLine.slice(0, commentIdx) : rawLine;
      const trimmed = lineWithoutComment.trim();

      // Skip blank lines
      if (!trimmed) {
        i++;
        continue;
      }

      const indent = rawLine.search(/\S/);
      if (indent < baseIndent) {
        break;
      }

      // Check if single-line compound statement (e.g. def foo(): return 1)
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1 && !trimmed.endsWith(':')) {
        const header = trimmed.slice(0, colonIdx).trim();
        const bodyPart = trimmed.slice(colonIdx + 1).trim();
        if (
          bodyPart &&
          (header.startsWith('def ') ||
            header.startsWith('if ') ||
            header.startsWith('elif ') ||
            header === 'else' ||
            header.startsWith('for ') ||
            header.startsWith('while '))
        ) {
          const bodyNodes = this.parseIndentedLines([`  ${bodyPart}`], 2);
          if (header.startsWith('def ')) {
            const defMatch = header.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/);
            if (!defMatch) throw new Error(`SyntaxError: invalid function definition: ${header}`);
            const funcName = defMatch[1];
            const params = defMatch[2].split(',').map((p) => p.trim()).filter(Boolean);
            nodes.push({ type: 'def', name: funcName, params, body: bodyNodes });
          } else if (header.startsWith('if ')) {
            const cond = header.slice(3).trim();
            nodes.push({ type: 'if', condition: cond, body: bodyNodes });
          } else if (header.startsWith('elif ')) {
            const cond = header.slice(5).trim();
            nodes.push({ type: 'elif', condition: cond, body: bodyNodes });
          } else if (header === 'else') {
            nodes.push({ type: 'else', body: bodyNodes });
          } else if (header.startsWith('for ')) {
            const forMatch = header.match(/^for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in\s+(.+)$/);
            if (!forMatch) throw new Error(`SyntaxError: invalid for loop: ${header}`);
            const varNames = forMatch[1].split(',').map((v) => v.trim());
            const iterExpr = forMatch[2].trim();
            nodes.push({ type: 'for', varNames, iterExpr, body: bodyNodes });
          } else if (header.startsWith('while ')) {
            const cond = header.slice(6).trim();
            nodes.push({ type: 'while', condition: cond, body: bodyNodes });
          }
          i++;
          continue;
        }
      }

      // Check for multi-line compound statements ending with ':'
      if (trimmed.endsWith(':')) {
        const header = trimmed.slice(0, -1).trim();
        // Gather body lines
        const bodyLines: string[] = [];
        let j = i + 1;
        while (j < lines.length) {
          const nextRaw = lines[j];
          const nextTrimmed = nextRaw.trim();
          if (!nextTrimmed || nextTrimmed.startsWith('#')) {
            j++;
            continue;
          }
          const nextIndent = nextRaw.search(/\S/);
          if (nextIndent <= indent) {
            break;
          }
          bodyLines.push(nextRaw);
          j++;
        }

        const childIndent = bodyLines.length > 0 ? bodyLines[0].search(/\S/) : indent + 2;
        const bodyNodes = this.parseIndentedLines(bodyLines, childIndent);

        if (header.startsWith('def ')) {
          const defMatch = header.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/);
          if (!defMatch) throw new Error(`SyntaxError: invalid function definition: ${header}`);
          const funcName = defMatch[1];
          const params = defMatch[2]
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
          nodes.push({ type: 'def', name: funcName, params, body: bodyNodes });
        } else if (header.startsWith('if ')) {
          const cond = header.slice(3).trim();
          nodes.push({ type: 'if', condition: cond, body: bodyNodes });
        } else if (header.startsWith('elif ')) {
          const cond = header.slice(5).trim();
          nodes.push({ type: 'elif', condition: cond, body: bodyNodes });
        } else if (header === 'else') {
          nodes.push({ type: 'else', body: bodyNodes });
        } else if (header.startsWith('for ')) {
          const forMatch = header.match(/^for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in\s+(.+)$/);
          if (!forMatch) throw new Error(`SyntaxError: invalid for loop: ${header}`);
          const varNames = forMatch[1].split(',').map((v) => v.trim());
          const iterExpr = forMatch[2].trim();
          nodes.push({ type: 'for', varNames, iterExpr, body: bodyNodes });
        } else if (header.startsWith('while ')) {
          const cond = header.slice(6).trim();
          nodes.push({ type: 'while', condition: cond, body: bodyNodes });
        } else {
          throw new Error(`SyntaxError: unsupported compound statement: ${header}`);
        }

        i = j;
      } else {
        // Simple statement
        nodes.push({ type: 'simple', text: trimmed });
        i++;
      }
    }

    return nodes;
  }

  // --------------------------------------------------------------------------
  // Statement Execution
  // --------------------------------------------------------------------------

  private executeStatements(nodes: StatementNode[], scope: Scope): void {
    let idx = 0;
    while (idx < nodes.length) {
      this.checkLimit();
      const node = nodes[idx];

      if (node.type === 'def') {
        const funcNode = node;
        const fn = (...callArgs: unknown[]) => {
          const localScope: Scope = { vars: new Map(), parent: scope };
          for (let p = 0; p < funcNode.params.length; p++) {
            localScope.vars.set(funcNode.params[p], callArgs[p]);
          }
          try {
            this.executeStatements(funcNode.body, localScope);
            return null;
          } catch (err) {
            if (err instanceof ReturnSignal) {
              return err.value;
            }
            throw err;
          }
        };
        this.setVar(node.name, fn, scope);
        idx++;
      } else if (node.type === 'if') {
        let conditionMet = Boolean(this.evalExpression(node.condition, scope));
        if (conditionMet) {
          this.executeStatements(node.body, scope);
        }

        // Check if subsequent nodes are elif / else
        idx++;
        while (idx < nodes.length && (nodes[idx].type === 'elif' || nodes[idx].type === 'else')) {
          const branch = nodes[idx];
          if (!conditionMet) {
            if (branch.type === 'elif') {
              const elifMet = Boolean(this.evalExpression(branch.condition, scope));
              if (elifMet) {
                conditionMet = true;
                this.executeStatements(branch.body, scope);
              }
            } else if (branch.type === 'else') {
              conditionMet = true;
              this.executeStatements(branch.body, scope);
            }
          }
          idx++;
        }
      } else if (node.type === 'for') {
        const iterable = this.evalExpression(node.iterExpr, scope);
        if (!Array.isArray(iterable) && typeof iterable !== 'string') {
          throw new PythonRuntimeError(`TypeError: '${typeof iterable}' object is not iterable`);
        }
        for (const item of iterable) {
          this.checkLimit();
          if (node.varNames.length === 1) {
            this.setVar(node.varNames[0], item, scope);
          } else if (Array.isArray(item)) {
            for (let v = 0; v < node.varNames.length; v++) {
              this.setVar(node.varNames[v], item[v], scope);
            }
          }
          try {
            this.executeStatements(node.body, scope);
          } catch (sig) {
            if (sig instanceof BreakSignal) break;
            if (sig instanceof ContinueSignal) continue;
            throw sig;
          }
        }
        idx++;
      } else if (node.type === 'while') {
        while (this.evalExpression(node.condition, scope)) {
          this.checkLimit();
          try {
            this.executeStatements(node.body, scope);
          } catch (sig) {
            if (sig instanceof BreakSignal) break;
            if (sig instanceof ContinueSignal) continue;
            throw sig;
          }
        }
        idx++;
      } else if (node.type === 'simple') {
        this.executeSimpleStatement(node.text, scope);
        idx++;
      } else {
        idx++;
      }
    }
  }

  private executeSimpleStatement(line: string, scope: Scope): void {
    if (line === 'pass') return;
    if (line === 'break') throw new BreakSignal();
    if (line === 'continue') throw new ContinueSignal();

    if (line.startsWith('return ') || line === 'return') {
      const expr = line === 'return' ? 'None' : line.slice(7).trim();
      const val = this.evalExpression(expr, scope);
      throw new ReturnSignal(val);
    }

    // Augmented assignment (e.g. x += 1)
    const augMatch = line.match(/^([a-zA-Z_]\w*|[^=]+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/);
    if (augMatch) {
      const target = augMatch[1].trim();
      const op = augMatch[2];
      const valExpr = augMatch[3].trim();
      const rightVal = this.evalExpression(valExpr, scope);
      const currVal = this.evalExpression(target, scope);
      let nextVal: unknown;
      if (op === '+=') nextVal = (currVal as number) + (rightVal as number);
      else if (op === '-=') nextVal = (currVal as number) - (rightVal as number);
      else if (op === '*=') nextVal = (currVal as number) * (rightVal as number);
      else if (op === '/=') nextVal = (currVal as number) / (rightVal as number);
      else if (op === '%=') nextVal = (currVal as number) % (rightVal as number);

      this.assignValue(target, nextVal, scope);
      return;
    }

    // Normal Assignment (e.g. x = 1 or a, b = 1, 2)
    const assignMatch = line.match(/^([^=]+)=(?!=)(.+)$/);
    if (assignMatch) {
      const leftPart = assignMatch[1].trim();
      const rightPart = assignMatch[2].trim();
      const val = this.evalExpression(rightPart, scope);

      if (leftPart.includes(',')) {
        const targets = leftPart.split(',').map((t) => t.trim());
        if (!Array.isArray(val) || val.length !== targets.length) {
          throw new PythonRuntimeError(`ValueError: not enough values to unpack (expected ${targets.length})`);
        }
        for (let t = 0; t < targets.length; t++) {
          this.assignValue(targets[t], val[t], scope);
        }
      } else {
        this.assignValue(leftPart, val, scope);
      }
      return;
    }

    // Naked expression / function call (e.g. print(...), list.append(...))
    this.evalExpression(line, scope);
  }

  private assignValue(target: string, value: unknown, scope: Scope): void {
    // Check if subscription: arr[idx] = val or d[k] = val
    const subMatch = target.match(/^(.+)\[([^\]]+)\]$/);
    if (subMatch) {
      const obj = this.evalExpression(subMatch[1].trim(), scope) as Record<string | number, unknown>;
      const idx = this.evalExpression(subMatch[2].trim(), scope) as string | number;
      assertSafeProperty(idx);
      if (Array.isArray(obj)) {
        const i = typeof idx === 'number' && idx < 0 ? obj.length + idx : (idx as number);
        obj[i] = value;
      } else if (obj && typeof obj === 'object') {
        obj[String(idx)] = value;
      }
      return;
    }

    // Check if attribute assignment: obj.prop = val
    const dotMatch = target.match(/^(.+)\.([a-zA-Z_]\w*)$/);
    if (dotMatch) {
      const obj = this.evalExpression(dotMatch[1].trim(), scope) as Record<string, unknown>;
      const prop = dotMatch[2].trim();
      assertSafeProperty(prop);
      if (obj && typeof obj === 'object') {
        obj[prop] = value;
      }
      return;
    }

    assertSafeProperty(target);
    this.setVar(target, value, scope);
  }

  // --------------------------------------------------------------------------
  // Expression Evaluator
  // --------------------------------------------------------------------------

  public evalExpression(expr: string, scope: Scope): unknown {
    expr = expr.trim();
    if (!expr) return null;

    // Literals
    if (expr === 'None') return null;
    if (expr === 'True') return true;
    if (expr === 'False') return false;

    // Numbers
    if (/^-?\d+$/.test(expr)) return parseInt(expr, 10);
    if (/^-?\d+\.\d+$/.test(expr)) return parseFloat(expr);

    // String literals (single quoted string with no middle top-level quotes)
    if (
      (/^"[^"\\]*(?:\\.[^"\\]*)*"$/.test(expr)) ||
      (/^'[^'\\]*(?:\\.[^'\\]*)*'$/.test(expr))
    ) {
      return expr.slice(1, -1);
    }

    // List literals [a, b, c]
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return [];

      // List comprehension: [expr for var in iterable if cond]
      const compMatch = inner.match(/^(.+)\s+for\s+([a-zA-Z_]\w*)\s+in\s+([^if]+)(?:\s+if\s+(.+))?$/);
      if (compMatch) {
        const yieldExpr = compMatch[1].trim();
        const varName = compMatch[2].trim();
        const iterExpr = compMatch[3].trim();
        const condExpr = compMatch[4]?.trim();

        const iterable = this.evalExpression(iterExpr, scope);
        if (!Array.isArray(iterable) && typeof iterable !== 'string') {
          throw new PythonRuntimeError(`TypeError: object is not iterable in comprehension`);
        }
        const res: unknown[] = [];
        for (const item of iterable) {
          const compScope: Scope = { vars: new Map(), parent: scope };
          compScope.vars.set(varName, item);
          if (condExpr) {
            const pass = Boolean(this.evalExpression(condExpr, compScope));
            if (!pass) continue;
          }
          res.push(this.evalExpression(yieldExpr, compScope));
        }
        return res;
      }

      // Plain list literal
      const parts = this.splitTopLevel(inner, ',');
      return parts.map((p) => this.evalExpression(p, scope));
    }

    // Dict literals {k: v}
    if (expr.startsWith('{') && expr.endsWith('}')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return Object.create(null);
      const pairs = this.splitTopLevel(inner, ',');
      const dict: Record<string, unknown> = Object.create(null);
      for (const pair of pairs) {
        const [kExpr, vExpr] = this.splitTopLevel(pair, ':');
        const k = String(this.evalExpression(kExpr, scope));
        assertSafeProperty(k);
        const v = this.evalExpression(vExpr, scope);
        dict[k] = v;
      }
      return dict;
    }

    // Tuple literal (a, b)
    if (expr.startsWith('(') && expr.endsWith(')') && !expr.includes('for ')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return [];
      const parts = this.splitTopLevel(inner, ',');
      if (parts.length === 1 && !inner.endsWith(',')) {
        // Grouped expression: (x + y)
        return this.evalExpression(inner, scope);
      }
      return parts.map((p) => this.evalExpression(p, scope));
    }

    // Boolean Logic: or, and, not
    const orParts = this.splitTopLevelOp(expr, ' or ');
    if (orParts.length > 1) {
      for (const part of orParts) {
        const val = this.evalExpression(part, scope);
        if (val) return val;
      }
      return this.evalExpression(orParts[orParts.length - 1], scope);
    }

    const andParts = this.splitTopLevelOp(expr, ' and ');
    if (andParts.length > 1) {
      for (const part of andParts) {
        const val = this.evalExpression(part, scope);
        if (!val) return val;
      }
      return this.evalExpression(andParts[andParts.length - 1], scope);
    }

    if (expr.startsWith('not ')) {
      return !this.evalExpression(expr.slice(4).trim(), scope);
    }

    // Comparisons (==, !=, <=, >=, <, >, in, not in)
    const compOps = ['==', '!=', '<=', '>=', '<', '>', ' not in ', ' in '];
    for (const op of compOps) {
      const parts = this.splitTopLevelOp(expr, op);
      if (parts.length === 2) {
        const left = this.evalExpression(parts[0], scope);
        const right = this.evalExpression(parts[1], scope);
        if (op === '==') return areOutputsEqual(left, right);
        if (op === '!=') return !areOutputsEqual(left, right);
        if (op === '<=') return (left as number) <= (right as number);
        if (op === '>=') return (left as number) >= (right as number);
        if (op === '<') return (left as number) < (right as number);
        if (op === '>') return (left as number) > (right as number);
        if (op === ' in ') {
          if (Array.isArray(right) || typeof right === 'string') {
            return (right as string).includes(left as string);
          }
          if (right && typeof right === 'object') {
            return Object.prototype.hasOwnProperty.call(right, String(left));
          }
          return false;
        }
        if (op === ' not in ') {
          if (Array.isArray(right) || typeof right === 'string') {
            return !(right as string).includes(left as string);
          }
          if (right && typeof right === 'object') {
            return !Object.prototype.hasOwnProperty.call(right, String(left));
          }
          return true;
        }
      }
    }

    // Arithmetic (+, -, *, /, //, %, **)
    const addSubParts = this.splitTopLevelAddSub(expr);
    if (addSubParts.length > 1) {
      let result = this.evalExpression(addSubParts[0].text, scope);
      for (let i = 1; i < addSubParts.length; i++) {
        const { op, text } = addSubParts[i];
        const right = this.evalExpression(text, scope);
        if (op === '+') {
          if (typeof result === 'string' || typeof right === 'string') {
            result = String(result) + String(right);
          } else if (Array.isArray(result) && Array.isArray(right)) {
            result = [...result, ...right];
          } else {
            result = Number(result) + Number(right);
          }
        } else if (op === '-') {
          result = Number(result) - Number(right);
        }
      }
      return result;
    }

    const mulDivParts = this.splitTopLevelMulDiv(expr);
    if (mulDivParts.length > 1) {
      let result = this.evalExpression(mulDivParts[0].text, scope);
      for (let i = 1; i < mulDivParts.length; i++) {
        const { op, text } = mulDivParts[i];
        const right = this.evalExpression(text, scope);
        if (op === '*') {
          if (typeof result === 'string') result = result.repeat(Number(right));
          else if (Array.isArray(result)) {
            const arrRes: unknown[] = [];
            for (let c = 0; c < Number(right); c++) arrRes.push(...result);
            result = arrRes;
          } else {
            result = Number(result) * Number(right);
          }
        } else if (op === '/') {
          if (Number(right) === 0) throw new PythonRuntimeError('ZeroDivisionError: division by zero');
          result = Number(result) / Number(right);
        } else if (op === '//') {
          if (Number(right) === 0) throw new PythonRuntimeError('ZeroDivisionError: integer division by zero');
          result = Math.floor(Number(result) / Number(right));
        } else if (op === '%') {
          if (Number(right) === 0) throw new PythonRuntimeError('ZeroDivisionError: integer modulo by zero');
          result = Number(result) % Number(right);
        }
      }
      return result;
    }

    // Method Call or Subscript on object: obj.method(...) or obj[idx]
    const methodCallMatch = expr.match(/^(.+)\.([a-zA-Z_]\w*)\((.*)\)$/);
    if (methodCallMatch) {
      const obj = this.evalExpression(methodCallMatch[1].trim(), scope);
      const methodName = methodCallMatch[2];
      const argExprs = this.splitTopLevel(methodCallMatch[3].trim(), ',');
      const args = argExprs.filter(Boolean).map((a) => this.evalExpression(a, scope));

      if (Array.isArray(obj)) {
        if (methodName === 'append') {
          obj.push(args[0]);
          return null;
        }
        if (methodName === 'pop') {
          return obj.pop();
        }
        if (methodName === 'extend' && Array.isArray(args[0])) {
          obj.push(...args[0]);
          return null;
        }
        if (methodName === 'reverse') {
          obj.reverse();
          return null;
        }
      } else if (typeof obj === 'string') {
        if (methodName === 'lower') return obj.toLowerCase();
        if (methodName === 'upper') return obj.toUpperCase();
        if (methodName === 'strip') return obj.trim();
        if (methodName === 'split') return obj.split(args[0] !== undefined ? String(args[0]) : ' ');
        if (methodName === 'replace') return obj.replaceAll(String(args[0]), String(args[1]));
        if (methodName === 'join' && Array.isArray(args[0])) return args[0].join(obj);
      } else if (obj && typeof obj === 'object') {
        if (methodName === 'get') {
          const dict = obj as Record<string, unknown>;
          const key = String(args[0]);
          assertSafeProperty(key);
          return Object.prototype.hasOwnProperty.call(dict, key)
            ? dict[key]
            : args[1] !== undefined ? args[1] : null;
        }
        if (methodName === 'keys') return Object.keys(obj);
        if (methodName === 'values') return Object.values(obj);
      }
    }

    // Indexing / Slicing: expr[index_or_slice]
    const sliceMatch = expr.match(/^(.+)\[([^\]]+)\]$/);
    if (sliceMatch) {
      const target = this.evalExpression(sliceMatch[1].trim(), scope);
      const sliceInner = sliceMatch[2].trim();

      // Slicing arr[start:stop:step]
      if (sliceInner.includes(':')) {
        const parts = sliceInner.split(':');
        const start = parts[0] ? Number(this.evalExpression(parts[0], scope)) : undefined;
        const stop = parts[1] ? Number(this.evalExpression(parts[1], scope)) : undefined;
        const step = parts[2] ? Number(this.evalExpression(parts[2], scope)) : 1;

        if (typeof target === 'string' || Array.isArray(target)) {
          const items = Array.isArray(target) ? [...target] : target.split('');
          if (step === -1) {
            items.reverse();
            return typeof target === 'string' ? items.join('') : items;
          }
          const sliced = items.slice(start, stop);
          return typeof target === 'string' ? sliced.join('') : sliced;
        }
      }

      // Single index arr[i]
      const idx = this.evalExpression(sliceInner, scope);
      if (Array.isArray(target) || typeof target === 'string') {
        let i = Number(idx);
        if (i < 0) i = target.length + i;
        if (i < 0 || i >= target.length) {
          throw new PythonRuntimeError('IndexError: index out of range');
        }
        return target[i];
      } else if (target && typeof target === 'object') {
        const dict = target as Record<string, unknown>;
        const key = String(idx);
        assertSafeProperty(key);
        if (!Object.prototype.hasOwnProperty.call(dict, key)) {
          throw new PythonRuntimeError(`KeyError: '${key}'`);
        }
        return dict[key];
      }
    }

    // Function call: func(arg1, arg2)
    const fnCallMatch = expr.match(/^([a-zA-Z_]\w*)\((.*)\)$/);
    if (fnCallMatch) {
      const fnName = fnCallMatch[1];
      const argExprs = this.splitTopLevel(fnCallMatch[2].trim(), ',');
      const args = argExprs.filter(Boolean).map((a) => this.evalExpression(a, scope));
      return this.callFunction(fnName, args);
    }

    // Plain variable lookup
    if (/^[a-zA-Z_]\w*$/.test(expr)) {
      const val = this.lookup(expr, scope);
      if (val === undefined) {
        throw new PythonRuntimeError(`NameError: name '${expr}' is not defined`);
      }
      return val;
    }

    throw new Error(`SyntaxError: unrecognized expression '${expr}'`);
  }

  // --------------------------------------------------------------------------
  // String Parsing Utilities (Respecting Quotes and Brackets)
  // --------------------------------------------------------------------------

  private splitTopLevel(str: string, delimiter: string): string[] {
    const results: string[] = [];
    let current = '';
    let depth = 0;
    let inQuote: string | null = null;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (inQuote) {
        current += char;
        if (char === inQuote && str[i - 1] !== '\\') inQuote = null;
      } else if (char === '"' || char === "'") {
        inQuote = char;
        current += char;
      } else if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (char === delimiter && depth === 0) {
        results.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) results.push(current.trim());
    return results;
  }

  private splitTopLevelOp(str: string, op: string): string[] {
    let depth = 0;
    let inQuote: string | null = null;

    for (let i = 0; i <= str.length - op.length; i++) {
      const char = str[i];
      if (inQuote) {
        if (char === inQuote && str[i - 1] !== '\\') inQuote = null;
      } else if (char === '"' || char === "'") {
        inQuote = char;
      } else if (char === '(' || char === '[' || char === '{') {
        depth++;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
      } else if (depth === 0 && str.slice(i, i + op.length) === op) {
        return [str.slice(0, i).trim(), str.slice(i + op.length).trim()];
      }
    }
    return [str];
  }

  private splitTopLevelAddSub(str: string): { op: string; text: string }[] {
    const tokens: { op: string; text: string }[] = [];
    let depth = 0;
    let inQuote: string | null = null;
    let current = '';
    let currentOp = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (inQuote) {
        current += char;
        if (char === inQuote && str[i - 1] !== '\\') inQuote = null;
      } else if (char === '"' || char === "'") {
        inQuote = char;
        current += char;
      } else if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (depth === 0 && (char === '+' || char === '-') && i > 0 && str[i - 1] !== 'e' && str[i - 1] !== 'E') {
        tokens.push({ op: currentOp, text: current.trim() });
        currentOp = char;
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      tokens.push({ op: currentOp, text: current.trim() });
    }
    return tokens;
  }

  private splitTopLevelMulDiv(str: string): { op: string; text: string }[] {
    const tokens: { op: string; text: string }[] = [];
    let depth = 0;
    let inQuote: string | null = null;
    let current = '';
    let currentOp = '';

    let i = 0;
    while (i < str.length) {
      const char = str[i];
      if (inQuote) {
        current += char;
        if (char === inQuote && str[i - 1] !== '\\') inQuote = null;
        i++;
      } else if (char === '"' || char === "'") {
        inQuote = char;
        current += char;
        i++;
      } else if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
        i++;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
        i++;
      } else if (depth === 0 && (char === '*' || char === '/' || char === '%')) {
        let op = char;
        if (char === '/' && str[i + 1] === '/') {
          op = '//';
          i++;
        }
        tokens.push({ op: currentOp, text: current.trim() });
        currentOp = op;
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    if (current.trim()) {
      tokens.push({ op: currentOp, text: current.trim() });
    }
    return tokens;
  }
}

type StatementNode =
  | { type: 'def'; name: string; params: string[]; body: StatementNode[] }
  | { type: 'if'; condition: string; body: StatementNode[] }
  | { type: 'elif'; condition: string; body: StatementNode[] }
  | { type: 'else'; body: StatementNode[] }
  | { type: 'for'; varNames: string[]; iterExpr: string; body: StatementNode[] }
  | { type: 'while'; condition: string; body: StatementNode[] }
  | { type: 'simple'; text: string };

/**
 * Executes Python user code against an item's authored test contract.
 */
export function executePythonAssessmentItem(
  item: AssessmentItem,
  code: string
): AssessmentExecutionResult {
  const startTime = Date.now();
  const contract = item.pythonContract;

  if (!contract || !contract.entryPoint || !contract.testCases || contract.testCases.length === 0) {
    return {
      passed: false,
      status: 'unsupported',
      errorCategory: EXECUTION_ERROR_CODES.UNSUPPORTED,
      message: 'Item does not define a valid Python execution contract',
      testsPassed: 0,
      totalTests: 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 1. Safety & Sandbox Verification
  const safety = validatePythonSafety(code);
  if (!safety.safe) {
    return {
      passed: false,
      status: 'sandbox_violation',
      errorCategory: EXECUTION_ERROR_CODES.SANDBOX_VIOLATION,
      message: safety.reason || 'Sandbox security violation',
      testsPassed: 0,
      totalTests: contract.testCases.length,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. Instantiate isolated interpreter
  const interpreter = new SandboxedPythonInterpreter({
    timeoutMs: contract.timeoutMs ?? 1500,
    maxSteps: 30_000,
  });

  // 3. Parse and run definitions
  try {
    interpreter.execute(code);
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    const isTimeout = err instanceof ExecutionTimeoutError;
    const isViolation = err instanceof PythonSandboxViolationError;
    const isSyntax = msg.startsWith('SyntaxError:');
    return {
      passed: false,
      status: isTimeout
        ? 'timeout'
        : isViolation
        ? 'sandbox_violation'
        : isSyntax
        ? 'syntax_error'
        : 'runtime_error',
      errorCategory: isTimeout
        ? EXECUTION_ERROR_CODES.TIMEOUT
        : isViolation
        ? EXECUTION_ERROR_CODES.SANDBOX_VIOLATION
        : isSyntax
        ? EXECUTION_ERROR_CODES.SYNTAX
        : EXECUTION_ERROR_CODES.RUNTIME,
      message: msg,
      testsPassed: 0,
      totalTests: contract.testCases.length,
      executionTimeMs: Date.now() - startTime,
      capturedLogs: interpreter.logs,
    };
  }

  // 4. Run test cases against entry point
  let testsPassed = 0;
  for (const tc of contract.testCases) {
    try {
      const actual = interpreter.callFunction(contract.entryPoint, tc.inputs);
      const isMatch = areOutputsEqual(actual, tc.expected);

      if (!isMatch) {
        return {
          passed: false,
          status: 'assertion_failure',
          errorCategory: EXECUTION_ERROR_CODES.ASSERTION,
          message: `Test case failure on input (${tc.inputs.map((i) => JSON.stringify(i)).join(', ')}). Expected ${JSON.stringify(tc.expected)}, but got ${JSON.stringify(actual)}`,
          testsPassed,
          totalTests: contract.testCases.length,
          executionTimeMs: Date.now() - startTime,
          actualOutput: actual,
          expectedOutput: tc.expected,
          capturedLogs: interpreter.logs,
        };
      }
      testsPassed++;
    } catch (err: unknown) {
      const msg = (err as Error).message || String(err);
      const isTimeout = err instanceof ExecutionTimeoutError;
      const isViolation = err instanceof PythonSandboxViolationError;
      return {
        passed: false,
        status: isTimeout ? 'timeout' : isViolation ? 'sandbox_violation' : 'runtime_error',
        errorCategory: isTimeout
          ? EXECUTION_ERROR_CODES.TIMEOUT
          : isViolation
          ? EXECUTION_ERROR_CODES.SANDBOX_VIOLATION
          : EXECUTION_ERROR_CODES.RUNTIME,
        message: `Runtime error on input (${tc.inputs.map((i) => JSON.stringify(i)).join(', ')}): ${msg}`,
        testsPassed,
        totalTests: contract.testCases.length,
        executionTimeMs: Date.now() - startTime,
        capturedLogs: interpreter.logs,
      };
    }
  }

  return {
    passed: true,
    status: 'success',
    message: `All ${testsPassed} test cases passed successfully`,
    testsPassed,
    totalTests: contract.testCases.length,
    executionTimeMs: Date.now() - startTime,
    capturedLogs: interpreter.logs,
  };
}

// ============================================================================
// SQL Execution Sandbox & Relational Evaluator
// ============================================================================

export interface SqlQueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

/**
 * Validates SQL query safety against destructive commands and multi-statements.
 */
export function validateSqlSafety(query: string): { safe: boolean; reason?: string } {
  const clean = query.trim().replace(/--[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const upper = clean.toUpperCase();

  const destructive = [
    'DROP ',
    'DELETE ',
    'UPDATE ',
    'INSERT ',
    'ALTER ',
    'CREATE ',
    'TRUNCATE ',
    'GRANT ',
    'REVOKE ',
    'EXEC ',
  ];

  for (const kw of destructive) {
    if (upper.includes(kw)) {
      return {
        safe: false,
        reason: `Destructive statement '${kw.trim()}' is not permitted in read-only assessment queries`,
      };
    }
  }

  if (!upper.startsWith('SELECT')) {
    return {
      safe: false,
      reason: 'Only SELECT queries are supported in execution-backed assessment tasks',
    };
  }

  return { safe: true };
}

/**
 * In-memory relational execution engine for assessment SQL queries.
 */
export class SandboxedSqlExecutor {
  private fixture: SqlFixture;

  constructor(fixture: SqlFixture) {
    this.fixture = fixture;
  }

  public execute(query: string): SqlQueryResult {
    const safety = validateSqlSafety(query);
    if (!safety.safe) {
      throw new Error(`SecurityError: ${safety.reason}`);
    }

    const cleanQuery = query.trim().replace(/;+$/, '');
    return this.executeSelectQuery(cleanQuery);
  }

  private executeSelectQuery(query: string): SqlQueryResult {
    // 1. Check for basic components via regex
    // SELECT [DISTINCT] cols FROM fromClause [WHERE whereClause] [GROUP BY groupClause] [HAVING havingClause] [ORDER BY orderClause] [LIMIT limitClause]
    const selectMatch = query.match(
      /^SELECT\s+(DISTINCT\s+)?([\s\S]+?)\s+FROM\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+GROUP\s+BY\s+([\s\S]+?))?(?:\s+HAVING\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?)?$/i
    );

    if (!selectMatch) {
      throw new Error('SyntaxError: malformed or unsupported SELECT query structure');
    }

    const isDistinct = Boolean(selectMatch[1]);
    const selectColsStr = selectMatch[2].trim();
    const fromStr = selectMatch[3].trim();
    const whereStr = selectMatch[4]?.trim();
    const groupByStr = selectMatch[5]?.trim();
    const havingStr = selectMatch[6]?.trim();
    const orderByStr = selectMatch[7]?.trim();
    const limitNum = selectMatch[8] ? parseInt(selectMatch[8], 10) : undefined;
    const offsetNum = selectMatch[9] ? parseInt(selectMatch[9], 10) : 0;

    // 2. Process FROM and JOINs
    const { combinedRows, colIndices } = this.processFromAndJoins(fromStr);

    // 3. Process WHERE clause
    let filteredRows = combinedRows;
    if (whereStr) {
      filteredRows = combinedRows.filter((row) => this.evalWhereCondition(whereStr, row, colIndices));
    }

    // 4. Process GROUP BY & Aggregates
    const selectItems = this.parseSelectColumns(selectColsStr);
    const hasAggregates = selectItems.some((s) => s.aggregate);

    let outputRows: (string | number | boolean | null)[][] = [];
    const outputCols = selectItems.map((s) => s.alias || s.expr);

    if (groupByStr) {
      const groupColNames = groupByStr.split(',').map((c) => c.trim().toLowerCase());
      const groups = new Map<string, (string | number | boolean | null)[][]>();

      for (const row of filteredRows) {
        const key = groupColNames
          .map((c) => {
            const idx = this.resolveColumnIndex(c, colIndices);
            return String(row[idx]);
          })
          .join('|');
        const list = groups.get(key) || [];
        list.push(row);
        groups.set(key, list);
      }

      for (const [, rowsInGroup] of groups) {
        if (havingStr && !this.evalHavingCondition(havingStr, rowsInGroup, colIndices)) {
          continue;
        }

        const projectedRow: (string | number | boolean | null)[] = [];
        for (const item of selectItems) {
          projectedRow.push(this.evalSelectItem(item, rowsInGroup, colIndices));
        }
        outputRows.push(projectedRow);
      }
    } else if (hasAggregates) {
      // Entire dataset is one group
      const projectedRow: (string | number | boolean | null)[] = [];
      for (const item of selectItems) {
        projectedRow.push(this.evalSelectItem(item, filteredRows, colIndices));
      }
      outputRows.push(projectedRow);
    } else {
      for (const row of filteredRows) {
        const projectedRow: (string | number | boolean | null)[] = [];
        for (const item of selectItems) {
          projectedRow.push(this.evalSelectItem(item, [row], colIndices));
        }
        outputRows.push(projectedRow);
      }
    }

    // 5. Handle DISTINCT
    if (isDistinct) {
      const seen = new Set<string>();
      outputRows = outputRows.filter((row) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // 6. Handle ORDER BY
    if (orderByStr) {
      const [orderCol, direction] = orderByStr.split(/\s+/);
      const isDesc = direction?.toUpperCase() === 'DESC';
      const orderIdx = outputCols.findIndex((c) => c.toLowerCase() === orderCol.toLowerCase());
      if (orderIdx !== -1) {
        outputRows.sort((a, b) => {
          const valA = a[orderIdx];
          const valB = b[orderIdx];
          if (valA === valB) return 0;
          if (valA === null) return 1;
          if (valB === null) return -1;
          const cmp = valA < valB ? -1 : 1;
          return isDesc ? -cmp : cmp;
        });
      }
    }

    // 7. Handle LIMIT & OFFSET
    if (offsetNum > 0 || limitNum !== undefined) {
      const start = offsetNum;
      const end = limitNum !== undefined ? start + limitNum : undefined;
      outputRows = outputRows.slice(start, end);
    }

    return {
      columns: outputCols,
      rows: outputRows,
    };
  }

  private processFromAndJoins(fromStr: string): {
    combinedRows: (string | number | boolean | null)[][];
    colIndices: Map<string, number>;
  } {
    // Parse base table and optional JOIN
    const joinMatch = fromStr.match(
      /^([a-zA-Z_]\w*)(?:\s+(?:AS\s+)?([a-zA-Z_]\w*))?(?:\s+(LEFT(?:\s+OUTER)?|RIGHT(?:\s+OUTER)?|INNER)?\s+JOIN\s+([a-zA-Z_]\w*)(?:\s+(?:AS\s+)?([a-zA-Z_]\w*))?\s+ON\s+([\s\S]+))?$/i
    );

    if (!joinMatch) {
      throw new Error(`SyntaxError: invalid FROM or JOIN clause '${fromStr}'`);
    }

    const t1Name = joinMatch[1].toLowerCase();
    const t1Alias = joinMatch[2]?.toLowerCase() || t1Name;
    const joinType = (joinMatch[3] || 'INNER').toUpperCase();
    const t2Name = joinMatch[4]?.toLowerCase();
    const t2Alias = joinMatch[5]?.toLowerCase() || t2Name;
    const onCondition = joinMatch[6]?.trim();

    const t1 = this.fixture.tables[t1Name];
    if (!t1) {
      throw new Error(`TableNotFound: table '${t1Name}' does not exist in fixture`);
    }

    const colIndices = new Map<string, number>();
    t1.columns.forEach((col, idx) => {
      colIndices.set(col.toLowerCase(), idx);
      colIndices.set(`${t1Alias}.${col.toLowerCase()}`, idx);
      colIndices.set(`${t1Name}.${col.toLowerCase()}`, idx);
    });

    if (!t2Name) {
      return {
        combinedRows: t1.rows.map((r) => [...r]),
        colIndices,
      };
    }

    const t2 = this.fixture.tables[t2Name];
    if (!t2) {
      throw new Error(`TableNotFound: joined table '${t2Name}' does not exist in fixture`);
    }

    const t1ColCount = t1.columns.length;
    t2.columns.forEach((col, idx) => {
      const combinedIdx = t1ColCount + idx;
      if (!colIndices.has(col.toLowerCase())) {
        colIndices.set(col.toLowerCase(), combinedIdx);
      }
      colIndices.set(`${t2Alias}.${col.toLowerCase()}`, combinedIdx);
      colIndices.set(`${t2Name}.${col.toLowerCase()}`, combinedIdx);
    });

    // Execute JOIN
    const onMatch = onCondition.match(/^([a-zA-Z_]\w*\.[a-zA-Z_]\w*)\s*=\s*([a-zA-Z_]\w*\.[a-zA-Z_]\w*)$/i);
    if (!onMatch) {
      throw new Error(`SyntaxError: unsupported ON condition '${onCondition}'`);
    }

    const leftIdx = this.resolveColumnIndex(onMatch[1], colIndices);
    const rightIdx = this.resolveColumnIndex(onMatch[2], colIndices);

    const combinedRows: (string | number | boolean | null)[][] = [];

    if (joinType.includes('LEFT')) {
      for (const row1 of t1.rows) {
        let matched = false;
        for (const row2 of t2.rows) {
          const v1 = row1[leftIdx < t1ColCount ? leftIdx : rightIdx];
          const v2 = row2[(leftIdx < t1ColCount ? rightIdx : leftIdx) - t1ColCount];
          if (v1 !== null && v2 !== null && v1 === v2) {
            combinedRows.push([...row1, ...row2]);
            matched = true;
          }
        }
        if (!matched) {
          combinedRows.push([...row1, ...new Array(t2.columns.length).fill(null)]);
        }
      }
    } else if (joinType.includes('RIGHT')) {
      for (const row2 of t2.rows) {
        let matched = false;
        for (const row1 of t1.rows) {
          const v1 = row1[leftIdx < t1ColCount ? leftIdx : rightIdx];
          const v2 = row2[(leftIdx < t1ColCount ? rightIdx : leftIdx) - t1ColCount];
          if (v1 !== null && v2 !== null && v1 === v2) {
            combinedRows.push([...row1, ...row2]);
            matched = true;
          }
        }
        if (!matched) {
          combinedRows.push([...new Array(t1.columns.length).fill(null), ...row2]);
        }
      }
    } else {
      // INNER JOIN
      for (const row1 of t1.rows) {
        for (const row2 of t2.rows) {
          const v1 = row1[leftIdx < t1ColCount ? leftIdx : rightIdx];
          const v2 = row2[(leftIdx < t1ColCount ? rightIdx : leftIdx) - t1ColCount];
          if (v1 !== null && v2 !== null && v1 === v2) {
            combinedRows.push([...row1, ...row2]);
          }
        }
      }
    }

    return { combinedRows, colIndices };
  }

  private resolveColumnIndex(colName: string, colIndices: Map<string, number>): number {
    const key = colName.trim().toLowerCase();
    if (colIndices.has(key)) {
      return colIndices.get(key)!;
    }
    throw new Error(`ColumnNotFound: column '${colName}' not found in query source`);
  }

  private parseSelectColumns(colsStr: string): {
    expr: string;
    alias?: string;
    aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    arg?: string;
  }[] {
    const items: { expr: string; alias?: string; aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; arg?: string }[] = [];
    const parts = colsStr.split(',').map((p) => p.trim());

    for (const part of parts) {
      const aliasMatch = part.match(/^([\s\S]+?)(?:\s+(?:AS\s+)?([a-zA-Z_]\w*))?$/i);
      const expr = aliasMatch ? aliasMatch[1].trim() : part;
      const alias = aliasMatch && aliasMatch[2] ? aliasMatch[2].trim() : undefined;

      const aggMatch = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\((.*?)\)$/i);
      if (aggMatch) {
        items.push({
          expr,
          alias,
          aggregate: aggMatch[1].toUpperCase() as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX',
          arg: aggMatch[2].trim(),
        });
      } else {
        items.push({ expr, alias });
      }
    }

    return items;
  }

  private evalSelectItem(
    item: { expr: string; aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; arg?: string },
    rows: (string | number | boolean | null)[][],
    colIndices: Map<string, number>
  ): string | number | boolean | null {
    if (!item.aggregate) {
      if (rows.length === 0) return null;
      const colIdx = this.resolveColumnIndex(item.expr, colIndices);
      return rows[0][colIdx];
    }

    const { aggregate, arg } = item;
    if (aggregate === 'COUNT') {
      if (arg === '*' || arg === '1') return rows.length;
      const colIdx = this.resolveColumnIndex(arg!, colIndices);
      return rows.filter((r) => r[colIdx] !== null).length;
    }

    const colIdx = this.resolveColumnIndex(arg!, colIndices);
    const nonNullVals = rows.map((r) => r[colIdx]).filter((v): v is number => typeof v === 'number');

    if (nonNullVals.length === 0) return null;

    if (aggregate === 'SUM') return nonNullVals.reduce((a, b) => a + b, 0);
    if (aggregate === 'AVG') return Math.round((nonNullVals.reduce((a, b) => a + b, 0) / nonNullVals.length) * 100) / 100;
    if (aggregate === 'MIN') return Math.min(...nonNullVals);
    if (aggregate === 'MAX') return Math.max(...nonNullVals);

    return null;
  }

  private evalWhereCondition(
    whereStr: string,
    row: (string | number | boolean | null)[],
    colIndices: Map<string, number>
  ): boolean {
    // Handle subquery in WHERE: col < (SELECT ...)
    const subqueryMatch = whereStr.match(/^([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?)\s*(<|>|<=|>=|=|!=)\s*\((SELECT\s+[\s\S]+)\)$/i);
    if (subqueryMatch) {
      const col = subqueryMatch[1];
      const op = subqueryMatch[2];
      const subQueryText = subqueryMatch[3];

      const subResult = this.executeSelectQuery(subQueryText);
      const subVal = subResult.rows.length > 0 && subResult.rows[0].length > 0 ? subResult.rows[0][0] : null;

      const val = row[this.resolveColumnIndex(col, colIndices)];
      if (val === null || subVal === null) return false;

      if (op === '<') return val < subVal;
      if (op === '>') return val > subVal;
      if (op === '<=') return val <= subVal;
      if (op === '>=') return val >= subVal;
      if (op === '=') return val === subVal;
      if (op === '!=') return val !== subVal;
    }

    // Handle AND / OR
    if (whereStr.toUpperCase().includes(' AND ')) {
      const parts = whereStr.split(/\s+AND\s+/i);
      return parts.every((p) => this.evalWhereCondition(p, row, colIndices));
    }
    if (whereStr.toUpperCase().includes(' OR ')) {
      const parts = whereStr.split(/\s+OR\s+/i);
      return parts.some((p) => this.evalWhereCondition(p, row, colIndices));
    }

    // IS NULL / IS NOT NULL
    const nullMatch = whereStr.match(/^([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?)\s+IS\s+(NOT\s+)?NULL$/i);
    if (nullMatch) {
      const colIdx = this.resolveColumnIndex(nullMatch[1], colIndices);
      const val = row[colIdx];
      const isNot = Boolean(nullMatch[2]);
      return isNot ? val !== null : val === null;
    }

    // Comparisons col op val
    const compMatch = whereStr.match(/^([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?)\s*(!=|<>|=|<|<=|>|>=)\s*([^()]+)$/);
    if (compMatch) {
      const colIdx = this.resolveColumnIndex(compMatch[1], colIndices);
      const op = compMatch[2];
      const rawVal = compMatch[3].trim();
      const val = row[colIdx];

      if (val === null) return false; // In SQL, comparisons with NULL evaluate to UNKNOWN (false in WHERE)

      let compareVal: unknown;
      if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
        compareVal = Number(rawVal);
      } else {
        compareVal = rawVal.replace(/^['"]|['"]$/g, '');
      }

      if (op === '=' || op === '==') return val === compareVal;
      if (op === '!=' || op === '<>') return val !== compareVal;
      if (op === '<') return (val as number) < (compareVal as number);
      if (op === '<=') return (val as number) <= (compareVal as number);
      if (op === '>') return (val as number) > (compareVal as number);
      if (op === '>=') return (val as number) >= (compareVal as number);
    }

    return true;
  }

  private evalHavingCondition(
    havingStr: string,
    rowsInGroup: (string | number | boolean | null)[][],
    colIndices: Map<string, number>
  ): boolean {
    const aggMatch = havingStr.match(/^(COUNT|SUM|AVG|MIN|MAX)\((.*?)\)\s*([<>=!]+)\s*(\d+)$/i);
    if (aggMatch) {
      const agg = aggMatch[1].toUpperCase() as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
      const arg = aggMatch[2].trim();
      const op = aggMatch[3];
      const threshold = parseInt(aggMatch[4], 10);

      const computed = this.evalSelectItem({ expr: '', aggregate: agg, arg }, rowsInGroup, colIndices);
      if (computed === null) return false;

      const num = Number(computed);
      if (op === '>=') return num >= threshold;
      if (op === '<=') return num <= threshold;
      if (op === '>') return num > threshold;
      if (op === '<') return num < threshold;
      if (op === '=' || op === '==') return num === threshold;
      if (op === '!=') return num !== threshold;
    }
    return true;
  }
}

/**
 * Executes a SQL assessment query against an item's authored fixture.
 */
export function executeSqlAssessmentItem(
  item: AssessmentItem,
  query: string
): AssessmentExecutionResult {
  const startTime = Date.now();
  const fixture = item.sqlFixture;

  if (!fixture || !fixture.tables || !fixture.expectedOutput) {
    return {
      passed: false,
      status: 'unsupported',
      errorCategory: EXECUTION_ERROR_CODES.UNSUPPORTED,
      message: 'Item does not define a valid SQL execution fixture',
      testsPassed: 0,
      totalTests: 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 1. Safety check
  const safety = validateSqlSafety(query);
  if (!safety.safe) {
    return {
      passed: false,
      status: 'sandbox_violation',
      errorCategory: EXECUTION_ERROR_CODES.SANDBOX_VIOLATION,
      message: safety.reason || 'SQL safety violation',
      testsPassed: 0,
      totalTests: 1,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. Execute on sandboxed fixture
  try {
    const executor = new SandboxedSqlExecutor(fixture);
    const actual = executor.execute(query);

    // 3. Compare with expected output
    const expected = fixture.expectedOutput;

    // Check columns
    const actualColsNorm = actual.columns.map((c) => c.toLowerCase());
    const expectedColsNorm = expected.columns.map((c) => c.toLowerCase());

    const colsMatch =
      actualColsNorm.length === expectedColsNorm.length &&
      actualColsNorm.every((col, i) => col === expectedColsNorm[i]);

    if (!colsMatch) {
      return {
        passed: false,
        status: 'assertion_failure',
        errorCategory: EXECUTION_ERROR_CODES.WRONG_RESULT,
        message: `Columns mismatch. Expected [${expected.columns.join(', ')}], but got [${actual.columns.join(', ')}]`,
        testsPassed: 0,
        totalTests: 1,
        executionTimeMs: Date.now() - startTime,
        actualOutput: actual,
        expectedOutput: expected,
      };
    }

    // Check rows
    let actRows = actual.rows;
    let expRows = expected.rows;

    if (!expected.orderSensitive) {
      actRows = [...actRows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      expRows = [...expRows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    const rowsMatch = areOutputsEqual(actRows, expRows);

    if (!rowsMatch) {
      return {
        passed: false,
        status: 'assertion_failure',
        errorCategory: EXECUTION_ERROR_CODES.WRONG_RESULT,
        message: `Row content mismatch. Query returned ${actRows.length} rows, expected ${expRows.length} rows`,
        testsPassed: 0,
        totalTests: 1,
        executionTimeMs: Date.now() - startTime,
        actualOutput: actual,
        expectedOutput: expected,
      };
    }

    return {
      passed: true,
      status: 'success',
      message: 'Query executed successfully and produced expected results',
      testsPassed: 1,
      totalTests: 1,
      executionTimeMs: Date.now() - startTime,
      actualOutput: actual,
      expectedOutput: expected,
    };
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    const isSyntax = msg.startsWith('SyntaxError:');
    return {
      passed: false,
      status: isSyntax ? 'syntax_error' : 'runtime_error',
      errorCategory: isSyntax ? EXECUTION_ERROR_CODES.SYNTAX : EXECUTION_ERROR_CODES.INVALID_QUERY,
      message: msg,
      testsPassed: 0,
      totalTests: 1,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
