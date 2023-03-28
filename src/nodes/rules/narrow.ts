import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Compilation } from "../compile.ts"
import { intersectUniqueLists, RuleNode } from "./rule.ts"

export class NarrowRule extends RuleNode<"narrow"> {
    constructor(public narrows: Narrow[]) {
        super(
            "narrow",
            narrows
                .map((_) => String(_))
                .sort()
                .join()
        )
    }

    intersect(other: NarrowRule) {
        const intersection = intersectUniqueLists(this.narrows, other.narrows)
        return intersection.length === this.narrows.length
            ? this
            : intersection.length === other.narrows.length
            ? other
            : new NarrowRule(intersection)
    }

    compile(c: Compilation) {
        return c.check("custom", this.id, this.id)
    }
}
