import type { PreparationSection, PreparationTopic } from '../types';

export const PREPARATION_SECTIONS: PreparationSection[] = [
  {
    id: 'coding',
    title: 'CODING',
    subtitle: 'Languages & Problem Solving',
    description: 'Master syntax, core programming concepts, data structures, and algorithmic execution.',
    topicIds: ['prep-lang', 'prep-coding-ds'],
  },
  {
    id: 'core_cs',
    title: 'CORE CS',
    subtitle: 'Computer Science Fundamentals',
    description: 'Build deep foundational understanding of SQL, DBMS, OOP, Operating Systems, and Computer Networks.',
    topicIds: ['prep-sql', 'prep-dbms', 'prep-oop', 'prep-os', 'prep-cn'],
  },
  {
    id: 'aptitude_communication',
    title: 'APTITUDE & COMMUNICATION',
    subtitle: 'Quantitative, Logic & Verbal Skills',
    description: 'Sharpen quantitative reasoning, logical deduction, verbal comprehension, and professional communication.',
    topicIds: ['prep-apt-quant', 'prep-apt-reasoning', 'prep-verbal', 'prep-comm'],
  },
  {
    id: 'interview_career',
    title: 'INTERVIEW & CAREER',
    subtitle: 'Mocks, Viva & Career Readiness',
    description: 'Practice technical viva, behavioral interviews, resume defense, and placement applications.',
    topicIds: ['prep-interview-tech', 'prep-interview-career'],
  },
];

export const PREPARATION_TOPICS: PreparationTopic[] = [
  {
    id: 'prep-lang',
    sectionId: 'coding',
    domainId: 'python',
    title: 'Programming Language',
    description: 'Core syntax, memory execution, typing system, built-in data structures, and language-specific idioms.',
    whyItMatters: 'Essential for coding rounds, live technical interviews, and writing clean maintainable code.',
    learningObjectives: [
      'Understand memory allocation, pass-by-value vs pass-by-reference semantics',
      'Master built-in data structures (Lists, Dicts, Sets, Tuples) and their time complexities',
      'Write clean, modular code utilizing OOP, exceptions, and standard libraries',
    ],
    prerequisites: ['Basic syntax', 'Control flow statements', 'Functions'],
    recommendedResources: [
      { title: 'Python Official Documentation & Tutorial', type: 'documentation', url: 'https://docs.python.org/3/tutorial/' },
      { title: 'Python Memory Management & Data Structures Deep Dive', type: 'article' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'evidence'],
    roadmapTopicId: 'topic-python-core',
  },
  {
    id: 'prep-coding-ds',
    sectionId: 'coding',
    domainId: 'dsa',
    title: 'Coding & Problem Solving',
    description: 'Algorithmic problem solving, complexity analysis, pattern recognition, and edge-case handling.',
    whyItMatters: 'Primary screening criterion for software engineering placement rounds.',
    learningObjectives: [
      'Recognize pattern applicability (Two Pointers, Sliding Window, Binary Search, Dynamic Programming)',
      'Analyze exact time and space complexity using Big-O notation',
      'Execute clean code without runtime errors under timed constraints',
    ],
    prerequisites: ['Arrays & Strings', 'Basic recursion', 'Space & Time complexity fundamentals'],
    recommendedResources: [
      { title: 'Standard Pattern Map & LeetCode Anchor Set', type: 'practice' },
      { title: 'Time and Space Complexity Cheatsheet', type: 'article' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-dsa-arrays',
  },
  {
    id: 'prep-sql',
    sectionId: 'core_cs',
    domainId: 'sql',
    title: 'SQL & Relational Queries',
    description: 'Relational query design, JOINs, Group By, Subqueries, Window Functions, and Query Optimization.',
    whyItMatters: 'Regular requirement in technical interviews, OA SQL rounds, and real-world backend development.',
    learningObjectives: [
      'Construct complex SQL queries involving multi-table INNER, LEFT, RIGHT, and FULL JOINs',
      'Utilize window functions (ROW_NUMBER, DENSE_RANK, LAG, LEAD) for analytics',
      'Understand query execution order and indexing strategies',
    ],
    prerequisites: ['Basic SELECT, WHERE, ORDER BY statements', 'Relational database schema concepts'],
    recommendedResources: [
      { title: 'SQL Zoo Interactive Exercises', type: 'practice', url: 'https://sqlzoo.net/' },
      { title: 'Mode Analytics SQL Tutorial', type: 'article', url: 'https://mode.com/sql-tutorial/' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-sql-joins',
  },
  {
    id: 'prep-dbms',
    sectionId: 'core_cs',
    domainId: 'dbms',
    title: 'Database Management Systems (DBMS)',
    description: 'ACID properties, Database Normalization (1NF to BCNF), Indexing (B-Trees), and Concurrency Control.',
    whyItMatters: 'Crucial core CS knowledge tested in technical interviews for system engineering roles.',
    learningObjectives: [
      'Explain ACID properties and transaction isolation levels with concrete examples',
      'Normalize unnormalized tables to 3NF and BCNF to eliminate redundancy',
      'Understand B-Tree indexing mechanisms and deadlock prevention algorithms',
    ],
    prerequisites: ['Basic relational database concepts', 'SQL query structure'],
    recommendedResources: [
      { title: 'DBMS Fundamentals & Normalization Guide', type: 'article' },
      { title: 'Transactions & Concurrency Control Lecture Notes', type: 'documentation' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-dbms-transactions',
  },
  {
    id: 'prep-oop',
    sectionId: 'core_cs',
    domainId: 'oop',
    title: 'Object-Oriented Programming (OOP)',
    description: 'Encapsulation, Inheritance, Polymorphism, Abstraction, and SOLID Object-Oriented Design principles.',
    whyItMatters: 'Core paradigm for software design and object-oriented viva / system design rounds.',
    learningObjectives: [
      'Implement Method Overloading, Overriding, and Interface Abstraction cleanly',
      'Apply SOLID design principles to eliminate code smell and tight coupling',
      'Draw UML class diagrams and design scalable object hierarchies',
    ],
    prerequisites: ['Classes and Objects', 'Constructors', 'Access modifiers'],
    recommendedResources: [
      { title: 'SOLID Principles with Real-world Examples', type: 'article' },
      { title: 'Object-Oriented Design Interview Primer', type: 'documentation' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-oop-solid',
  },
  {
    id: 'prep-os',
    sectionId: 'core_cs',
    domainId: 'os',
    title: 'Operating Systems (OS)',
    description: 'Processes, Threads, CPU Scheduling, Virtual Memory, Paging, Deadlocks, and System Calls.',
    whyItMatters: 'Frequent viva domain in top tech company technical interviews.',
    learningObjectives: [
      'Differentiate processes vs threads, user mode vs kernel mode, and context switching overhead',
      'Analyze CPU scheduling algorithms (Round Robin, SRTF, Priority Scheduling)',
      'Explain virtual memory management, page replacement algorithms, and deadlock conditions (Coffman)',
    ],
    prerequisites: ['Basic computer organization', 'Binary & Memory concepts'],
    recommendedResources: [
      { title: 'Operating System Concepts (Galvin Summary)', type: 'article' },
      { title: 'OS Process & Memory Virtualization Guide', type: 'documentation' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-os-memory',
  },
  {
    id: 'prep-cn',
    sectionId: 'core_cs',
    domainId: 'cn',
    title: 'Computer Networks (CN)',
    description: 'OSI 7-layer model, TCP/IP, IP Addressing & Subnetting, TCP Handshake, HTTP/HTTPS, and DNS.',
    whyItMatters: 'Essential knowledge for network programming, cloud backend roles, and core CS interviews.',
    learningObjectives: [
      'Map protocols (HTTP, TCP, UDP, IP, ARP, DNS) to appropriate OSI model layers',
      'Explain TCP 3-Way Handshake, congestion control mechanisms, and UDP trade-offs',
      'Calculate IPv4 subnets, network prefixes, and host capacities',
    ],
    prerequisites: ['Basic internet fundamentals', 'Client-server architecture concepts'],
    recommendedResources: [
      { title: 'Computer Networks: A Top-Down Approach Summary', type: 'article' },
      { title: 'TCP/IP Handshake & Packet Inspection Guide', type: 'documentation' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-cn-http',
  },
  {
    id: 'prep-apt-quant',
    sectionId: 'aptitude_communication',
    domainId: 'aptitude',
    title: 'Quantitative Aptitude',
    description: 'Numerical agility, percentages, ratios, profit/loss, time & work, permutations & probability.',
    whyItMatters: 'Primary elimination barrier in first-round campus placement online assessments (OA).',
    learningObjectives: [
      'Solve speed, time, distance, and work problems using ratio shortcuts',
      'Calculate percentage changes, profit-loss margins, and compound interest rapidly',
      'Compute permutations, combinations, and probability distributions under timer pressure',
    ],
    prerequisites: ['High school algebra & arithmetic'],
    recommendedResources: [
      { title: 'Quantitative Aptitude Formulae Cheatsheet', type: 'article' },
      { title: 'Speed Math Shortcuts & Drill Questions', type: 'practice' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'evidence'],
    roadmapTopicId: 'topic-apt-arithmetic',
  },
  {
    id: 'prep-apt-reasoning',
    sectionId: 'aptitude_communication',
    domainId: 'aptitude',
    title: 'Logical & Analytical Reasoning',
    description: 'Puzzles, seating arrangements, syllogisms, blood relations, and pattern deduction.',
    whyItMatters: 'Evaluates problem decomposition and structured thinking in placement test batteries.',
    learningObjectives: [
      'Construct matrix tables to solve complex seating arrangement and grouping puzzles',
      'Evaluate syllogisms using Venn diagrams and formal deductive logic',
      'Identify number/letter series rules and spatial reasoning patterns quickly',
    ],
    prerequisites: ['Basic logical thinking'],
    recommendedResources: [
      { title: 'Analytical Puzzles Strategy Guide', type: 'article' },
      { title: 'Syllogism Rules & Practice Problems', type: 'practice' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'evidence'],
    roadmapTopicId: 'topic-apt-reasoning',
  },
  {
    id: 'prep-verbal',
    sectionId: 'aptitude_communication',
    domainId: 'communication',
    title: 'Verbal & English Capability',
    description: 'Reading comprehension, error spot, vocabulary in context, and sentence correction.',
    whyItMatters: 'Mandatory section in major hiring company OAs (e.g., TCS NQT, Infosys, Accenture).',
    learningObjectives: [
      'Analyze reading comprehension passages to answer inference and main-idea questions',
      'Identify grammatical errors in subject-verb agreement, tenses, and modifiers',
      'Select appropriate vocabulary in context to complete sentence completion tasks',
    ],
    prerequisites: ['Standard English grammar'],
    recommendedResources: [
      { title: 'Grammar Rules for Placement OAs', type: 'article' },
      { title: 'Reading Comprehension Speed Practice', type: 'practice' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'evidence'],
    roadmapTopicId: 'topic-verbal-grammar',
  },
  {
    id: 'prep-comm',
    sectionId: 'aptitude_communication',
    domainId: 'communication',
    title: 'Professional & Business Communication',
    description: 'Email etiquette, professional articulation, presentation structure, and team communication.',
    whyItMatters: 'Evaluates readiness for HR rounds, client interaction, and professional workplace integration.',
    learningObjectives: [
      'Draft concise, polite, and action-oriented professional emails',
      'Structure verbal responses using the STAR (Situation, Task, Action, Result) method',
      'Communicate complex technical concepts clearly to non-technical stakeholders',
    ],
    prerequisites: ['Basic spoken and written English'],
    recommendedResources: [
      { title: 'STAR Method Communication Handbook', type: 'article' },
      { title: 'Professional Workplace Email Templates', type: 'documentation' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-comm-email',
  },
  {
    id: 'prep-interview-tech',
    sectionId: 'interview_career',
    domainId: 'interviews',
    title: 'Technical Mocks & System Viva',
    description: 'Live coding walkthroughs, technical concept defense, trade-off analysis, and system viva.',
    whyItMatters: 'Prepares candidate to articulate code decisions live under interviewer scrutiny.',
    learningObjectives: [
      'Articulate algorithm choices and space-time trade-offs clearly out loud while coding',
      'Defend architectural choices when challenged by an interviewer',
      'Handle edge-case probing questions calmly and systematically',
    ],
    prerequisites: ['DSA fundamentals', 'Core CS knowledge'],
    recommendedResources: [
      { title: 'Mock Technical Interview Checklist', type: 'documentation' },
      { title: 'Common Technical Viva Question Bank', type: 'article' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-interview-tech',
  },
  {
    id: 'prep-interview-career',
    sectionId: 'interview_career',
    domainId: 'interviews',
    title: 'Resume & Career Defense',
    description: 'Project defense, resume line item verification, behavioral questions, and career story.',
    whyItMatters: 'Determines outcome of final HR and managerial interview rounds.',
    learningObjectives: [
      'Defend every bullet point, tech stack choice, and metrics on your resume',
      'Answer behavioral questions (conflict resolution, failure, leadership) using STAR stories',
      'Ask insightful questions to interviewers about role, team, and engineering culture',
    ],
    prerequisites: ['Completed resume draft', 'Personal project understanding'],
    recommendedResources: [
      { title: 'Resume Bullet Point Defense Playbook', type: 'article' },
      { title: 'Behavioral Interview STAR Question Bank', type: 'documentation' },
    ],
    stages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
    roadmapTopicId: 'topic-projects-defense',
  },
];

export function getPreparationSection(id: string): PreparationSection | undefined {
  return PREPARATION_SECTIONS.find((s) => s.id === id);
}

export function getPreparationTopic(id: string): PreparationTopic | undefined {
  return PREPARATION_TOPICS.find((t) => t.id === id);
}

export function getTopicsBySection(sectionId: string): PreparationTopic[] {
  return PREPARATION_TOPICS.filter((t) => t.sectionId === sectionId);
}
