import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Compilation } from "../node.ts"
import { intersectUniqueLists, Rule } from "./rule.ts"

export class NarrowRule extends Rule<"narrow"> {
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
        return new NarrowRule(intersectUniqueLists(this.narrows, other.narrows))
    }

    compile(c: Compilation) {
        return c.check("custom", this.id, this.id)
    }
}
