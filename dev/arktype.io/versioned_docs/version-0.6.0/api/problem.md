---
hide_table_of_contents: true
---

# Problem

## text

```ts
export declare class Problem<code extends ProblemCode = any> {
    code: code
    path: Path
    private data
    private source
    private writers
    parts?: Problem[]
    constructor(
        code: code,
        path: Path,
        data: ProblemData<code>,
        source: ProblemSource<code>,
        writers: ProblemWriters<code>
    )
    toString(): string
    get message(): string
    get reason(): string
    get mustBe(): string
}
```
