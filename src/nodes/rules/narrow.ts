import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Compilation } from "../compile.ts"
import type { IntersectionResult, IntersectionState } from "../compose.ts"
import { listUnion } from "./collapsibleSet.ts"
import { intersectUniqueLists, RuleNode } from "./rule.ts"

export class NarrowNode extends RuleNode<Narrow[]> {
    intersect(
        r: NarrowNode,
        s: IntersectionState
    ): IntersectionResult<NarrowNode> {
        const result = listUnion(this.rule, r.rule)
        return result.length === this.rule.length
            ? result.length === r.rule.length
                ? s.equality(this)
                : s.supertype(this)
            : result.length === this.rule.length
            ? s.subtype(r)
            : s.overlap(new NarrowNode(result))
    }

    compile(c: Compilation) {
        return ""
    }
}

export const narrowNode: RuleNode<readonly Narrow[]> = {
    constructor() {},
    intersect: intersectUniqueLists<Narrow>,
    compile: () => ""
}
