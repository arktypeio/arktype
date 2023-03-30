import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain } from "../../utils/domains.ts"
import type { Compilation } from "../node.ts"
import { intersectUniqueLists, Rule } from "./rule.ts"

export class NarrowRule<domain extends Domain = any> extends Rule<"narrow"> {
    constructor(public narrows: Narrow<domain>[]) {
        super(
            "narrow",
            narrows
                .map((_) => String(_))
                .sort()
                .join()
        )
    }

    intersect(other: NarrowRule<domain>) {
        return new NarrowRule(intersectUniqueLists(this.narrows, other.narrows))
    }

    compile(c: Compilation) {
        return c.check("custom", this.id, this.id)
    }
}
