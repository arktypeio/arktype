import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"
import { listUnion } from "./collapsibleSet.ts"
import { intersectUniqueLists, RuleNode } from "./rule.ts"

export class NarrowNode extends RuleNode<Narrow[]> {
    compare(r: NarrowNode, s: ComparisonState): Comparison<NarrowNode> {
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
    compare: intersectUniqueLists<Narrow>,
    compile: () => ""
}
