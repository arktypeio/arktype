import type { Narrow } from "../../parse/ast/narrow.ts"
import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { ComparisonState } from "../compose.ts"
import { registerConstructor } from "../registry.ts"
import { intersectUniqueLists, RuleNode } from "./rule.ts"

export class NarrowRule extends RuleNode<"narrow", readonly Narrow[]> {
    readonly kind = "narrow"

    intersectRule(other: readonly Narrow[]) {
        return intersectUniqueLists(this.rule, other)
    }

    serialize() {
        return "not implemented"
    }

    compile(c: Compilation) {
        return c.check("custom", this.key, this.key)
    }
}
