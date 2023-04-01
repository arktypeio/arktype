import type { Filter } from "../../parse/ast/filter.ts"
import { intersectUniqueLists } from "../../utils/generics.ts"
import type { CompilationState } from "../node.ts"
import { Node } from "../node.ts"

export class FilterNode extends Node<typeof FilterNode> {
    constructor(public predicates: Filter[]) {
        super(FilterNode, predicates)
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
        return new FilterNode(intersectUniqueLists(l.predicates, r.predicates))
    }
}
