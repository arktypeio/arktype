import type { Compilation } from "../compile"
import type { IntersectionResult, IntersectionState } from "../compose.ts"

export abstract class RuleNode<rule> {
    constructor(public rule: rule) {}

    abstract intersect(
        r: RuleNode<rule>,
        s: IntersectionState
    ): IntersectionResult<RuleNode<rule>>

    abstract compile(c: Compilation): string
}

export abstract class UniqueListNode<
    list extends readonly any[]
> extends RuleNode<list> {
    intersect(r: UniqueListNode<list>, s: IntersectionState) {
        const result = [...this.rule]
        for (const item of r.rule) {
            if (!l.includes(item)) {
                result.push(item)
            }
        }
        return result.length === l.length
            ? result.length === r.length
                ? s.equality(l)
                : s.supertype(l)
            : result.length === l.length
            ? s.subtype(r)
            : s.overlap(result)
    }
}

export const intersectUniqueLists = <item>(
    l: readonly item[],
    r: readonly item[],
    s: IntersectionState
): IntersectionResult<readonly item[]> => {}
