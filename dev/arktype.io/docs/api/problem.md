---
hide_table_of_contents: true
---

# Problem

## text

```ts
export declare abstract class Problem<requirement = unknown, data = unknown> {
    rule: requirement
    data: DataWrapper<data>
    path: Path
    abstract readonly code: ProblemCode
    abstract mustBe: string
    constructor(rule: requirement, data: data, segments: Segments)
    hasCode<code extends ProblemCode>(code: code): this is ProblemFrom<code>
    get message(): string
    get reason(): string
    get was(): string
    toString(): string
}
```
