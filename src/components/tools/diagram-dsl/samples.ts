import type { DiagramType } from "./transpiler/types";

interface Sample {
  label: string;
  type: DiagramType;
  code: string;
}

export const samples: Sample[] = [
  {
    label: "Flowchart",
    type: "flowchart",
    code: `flowchart
direction LR

Start [Start] -> Input [User Input] -> Validate {Valid?}
Validate -> Process [Process Data]: yes
Validate -> Error [Show Error]: no
Error -> Input
Process -> Save [Save to DB] -> Done [Done]`,
  },
  {
    label: "Sequence",
    type: "sequence",
    code: `sequence

participant U as User
participant A as API
participant D as Database

U -> A: POST /login
A -> D: SELECT user
D --> A: user record
A -> A: verify password
A --> U: 200 JWT token

note over A: Token expires in 24h`,
  },
  {
    label: "Class",
    type: "class",
    code: `class

<<interface>> Serializable

Animal {
  +name: string
  +age: int
  +makeSound()
  -metabolism: float
}

Dog extends Animal {
  +breed: string
  +fetch()
  +bark()
}

Cat extends Animal {
  +indoor: bool
  +purr()
}

Owner {
  +name: string
  +pets: Animal[]
}

Owner "1" -- "*" Animal: owns`,
  },
  {
    label: "ERD",
    type: "erd",
    code: `erd

User { id PK, email string UK, name string, created_at datetime }
Post { id PK, user_id int FK, title string, body text, published bool }
Comment { id PK, post_id int FK, author_id int FK, content text }
Tag { id PK, name string UK }
PostTag { post_id int FK, tag_id int FK }

User ||--o{ Post: writes
User ||--o{ Comment: authors
Post ||--o{ Comment: has
Post ||--o{ PostTag: tagged
Tag ||--o{ PostTag: used_in`,
  },
  {
    label: "Gantt",
    type: "gantt",
    code: `gantt

title Product Launch Timeline
dateFormat YYYY-MM-DD

section Planning
  Requirements: done, 2026-01-01, 14d
  Design: done, 2026-01-15, 10d
  Tech spec: done, 2026-01-25, 5d

section Development
  Backend API: active, 2026-02-01, 21d
  Frontend: 2026-02-15, 18d
  Integration: 2026-03-05, 7d

section Launch
  QA Testing: 2026-03-12, 10d
  Deploy: 2026-03-22, 2d
  Marketing: 2026-03-24, 7d`,
  },
  {
    label: "State",
    type: "state",
    code: `state

[*] -> Idle
Idle -> Fetching: submit
Fetching -> Success: 200 OK
Fetching -> Error: network error
Error -> Idle: retry
Error -> [*]: give up
Success -> Idle: reset
Success -> [*]: done

state Fetching {
  [*] -> Requesting
  Requesting -> Parsing: response
  Parsing -> [*]
}`,
  },
  {
    label: "Pie",
    type: "pie",
    code: `pie

title Tech Stack Usage 2026
showData
TypeScript: 38
Python: 22
Go: 15
Rust: 12
Java: 8
Other: 5`,
  },
  {
    label: "Mindmap",
    type: "mindmap",
    code: `mindmap

Software Architecture
  Frontend
    React
    Next.js
    Tailwind CSS
  Backend
    Node.js
    PostgreSQL
    Redis
  Infrastructure
    AWS
    Docker
    Kubernetes
  Practices
    CI/CD
    Testing
    Monitoring`,
  },
];
