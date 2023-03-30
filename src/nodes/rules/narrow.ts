import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain } from "../../utils/domains.ts"
import type { Compilation } from "../node.ts"
import { intersectUniqueLists, Rule } from "./rule.ts"

export class NarrowRule<domain extends Domain = any> extends Rule<"narrow"> {
    constructor(public definition: Narrow<domain>[]) {
        super(
            "narrow",
            definition
                .map((_) => String(_))
                .sort()
                .join()
        )
    }

    intersect(other: NarrowRule<domain>) {
        return new NarrowRule(
            intersectUniqueLists(this.definition, other.definition)
        )
    }

    compile(c: Compilation) {
        return c.check("custom", this.id, this.id)
    }
}
