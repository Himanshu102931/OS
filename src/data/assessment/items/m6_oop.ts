import type { AssessmentItem } from '../../../types';

/**
 * M6: OOP Code Reasoning
 * 7 items, 12 minutes budget
 * Difficulty: 3 easy (diff 1-2), 3 medium (diff 3), 1 hard (diff 4)
 * Formats: MCQ, code trace, structured written design answer
 */
export const M6_OOP_ITEMS: AssessmentItem[] = [
  // --- Easy Items (3 items: 1 diff 1, 2 diff 2) ---
  {
    id: 'asm-oop-001',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-principle-identification',
    difficulty: 1,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Which SOLID object-oriented design principle states that software modules should be open for extension, but closed for modification?',
    options: [
      'Single Responsibility Principle (SRP)',
      'Open/Closed Principle (OCP)',
      'Liskov Substitution Principle (LSP)',
      'Interface Segregation Principle (ISP)'
    ],
    key: 1,
    explanation: 'The Open/Closed Principle (OCP) states that classes or modules should be extendable (via polymorphism, composition, or interfaces) without modifying tested existing source code.',
    errorCategories: ['E-TERM', 'oop-vocabulary'],
    origin: 'assessment',
  },
  {
    id: 'asm-oop-002',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-code-trace',
    difficulty: 2,
    estimatedMinutes: 1.5,
    questionType: 'code_trace',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Consider the following polymorphic code snippet:\n```java\nclass Parent {\n    void show() { System.out.print("P"); }\n}\nclass Child extends Parent {\n    void show() { System.out.print("C"); }\n}\nParent obj = new Child();\nobj.show();\n```\nWhat is printed, and by which language mechanism?',
    options: [
      '"C" via dynamic (runtime) method dispatch',
      '"P" via static (compile-time) reference type binding',
      '"PC" because subclass methods implicitly chain to parent methods',
      'Compilation error because reference type does not match instance type'
    ],
    key: 0,
    explanation: 'In Java/C++, virtual method calls resolve to the actual runtime object instance on the heap. Because the instance is `Child`, `Child.show()` is invoked at runtime.',
    errorCategories: ['E-CONCEPT', 'oop-code-trace'],
    origin: 'assessment',
  },
  {
    id: 'asm-oop-003',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-design-tradeoff',
    difficulty: 2,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Why is "favor composition over inheritance" widely considered an industry best practice in software engineering?',
    options: [
      'Composition reduces tight coupling, prevents fragile base-class problems, and allows behavior to be swapped dynamically at runtime',
      'Inheritance consumes more stack memory than object composition at runtime',
      'Composition eliminates the necessity of unit testing component classes',
      'Inherited methods cannot be overridden in modern compilers'
    ],
    key: 0,
    explanation: 'Inheritance creates tight compile-time coupling and exposes subclasses to base-class implementation changes (fragile base class). Composition connects objects via interfaces, promoting loose coupling and runtime flexibility.',
    errorCategories: ['E-CONCEPT', 'oop-design-tradeoff'],
    origin: 'assessment',
  },

  // --- Medium Items (3 items: diff 3) ---
  {
    id: 'asm-oop-004',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-principle-identification',
    difficulty: 3,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'A base class `Bird` defines method `fly()`. A subclass `Penguin` inherits from `Bird` and overrides `fly()` to throw an `UnsupportedOperationException`. Which SOLID principle is directly violated?',
    options: [
      'Liskov Substitution Principle (LSP)',
      'Single Responsibility Principle (SRP)',
      'Dependency Inversion Principle (DIP)',
      'Law of Demeter'
    ],
    key: 0,
    explanation: 'LSP requires that objects of a superclass should be replaceable with objects of a subclass without affecting application correctness. If code expecting a Bird crashes on Penguin.fly(), LSP is broken.',
    errorCategories: ['E-APPLY', 'oop-principle-identification'],
    origin: 'assessment',
  },
  {
    id: 'asm-oop-005',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-design-tradeoff',
    difficulty: 3,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Which GoF design pattern defines a family of algorithms, encapsulates each one into an independent class, and makes them interchangeable at runtime?',
    options: [
      'Strategy Pattern',
      'Singleton Pattern',
      'Decorator Pattern',
      'Adapter Pattern'
    ],
    key: 0,
    explanation: 'The Strategy pattern encapsulates interchangeable algorithms behind a common interface, allowing client contexts to switch algorithms at runtime without modifying client code.',
    errorCategories: ['E-PATTERN', 'oop-design-tradeoff'],
    origin: 'assessment',
  },
  {
    id: 'asm-oop-006',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-code-trace',
    difficulty: 3,
    estimatedMinutes: 2,
    questionType: 'code_trace',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'What is printed by this constructor chaining sequence?\n```java\nclass Base {\n    Base() { System.out.print("B1 "); }\n}\nclass Derived extends Base {\n    Derived() {\n        this(5);\n        System.out.print("D1 ");\n    }\n    Derived(int x) {\n        System.out.print("D2 ");\n    }\n}\nDerived d = new Derived();\n```',
    options: [
      'B1 D2 D1 ',
      'D2 D1 B1 ',
      'B1 D1 D2 ',
      'D1 D2 B1 '
    ],
    key: 0,
    explanation: '`new Derived()` calls `this(5)`. `Derived(int)` implicitly invokes `super()` first. `Base()` prints "B1 ". Then `Derived(int)` body prints "D2 ". Finally `Derived()` constructor finishes, printing "D1 ".',
    errorCategories: ['E-EXEC', 'oop-code-trace'],
    origin: 'assessment',
  },

  // --- Hard Items (1 item: diff 4) ---
  {
    id: 'asm-oop-007',
    domainId: 'oop',
    topicId: 'prep-oop',
    competency: 'oop-design-tradeoff',
    difficulty: 4,
    estimatedMinutes: 2,
    questionType: 'structured_written',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'rubric', weight: 1, rubricId: 'rubric-oop-di' },
    prompt: 'Explain the Dependency Inversion Principle (DIP).\n\nStructure:\n1. State the relationship between high-level and low-level modules.\n2. State how abstractions connect details.\n3. Provide a concrete example showing how DIP decouples business logic from external dependencies.',
    options: [
      'High-level modules should not depend on low-level modules; both should depend on abstractions. E.g., OrderService depends on PaymentProcessor interface, not StripeClient concrete class.',
      'Classes should inherit from abstract classes only, never interfaces.',
      'Objects should communicate only with their immediate neighbors.',
      'Subclasses must override every method of their parent class.'
    ],
    key: 0,
    explanation: 'Rubric Criteria:\n1. High-level modules should not depend on low-level modules; both should depend on abstractions.\n2. Abstractions should not depend on details; details should depend on abstractions.\n3. Example: PaymentService depends on an IPaymentGateway interface rather than directly instantiating a concrete vendor API.',
    errorCategories: ['E-CONCEPT', 'oop-design-tradeoff'],
    origin: 'assessment',
  },
];
