---
hide_table_of_contents: true
---

# Problem

## text

```ts
export declare class Problem {
    code: ProblemCode
    path: Path
    private data
    private rule
    private writers
    constructor(
        code: ProblemCode,
        path: Path,
        data: ProblemDataInput,
        rule: ProblemRuleInput,
        writers: ProblemWriterConfig<any>
    )
    toString(): string
    get message(): string
    get reason(): string
    get mustBe(): string
    get was(): string
}
```
