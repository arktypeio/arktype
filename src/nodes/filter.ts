import type { Filter } from "../parse/ast/filter.ts"
import { intersectUniqueLists } from "../utils/generics.ts"
import { Node } from "./node.ts"
import type { CompilationState } from "./node.ts"

export class FilterNode extends Node<typeof FilterNode> {
    constructor(public rule: Filter[]) {
        super(FilterNode, rule)
    }

    static compile(sources: Filter[], c: CompilationState) {
        return sources
            .sort()
            .map(
                (source) =>
                    `${source}.test(${c.data}) || ${c.problem(
                        "regex",
                        "`" + source + "`"
                    )}` as const
            )
            .join(";")
    }

    static intersect(l: FilterNode, r: FilterNode) {
        return new FilterNode(intersectUniqueLists(l.rule, r.rule))
    }
}
