import type { Filter } from "../../parse/ast/filter.ts"
import { intersectUniqueLists } from "../../utils/generics.ts"
import type { CompilationState } from "../node.ts"
import { Node } from "../node.ts"

export class FiltersNode extends Node<typeof FiltersNode> {
    constructor(public checkers: Filter[]) {
        super(FiltersNode, checkers)
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

    static intersect(l: FiltersNode, r: FiltersNode) {
        return new FiltersNode(intersectUniqueLists(l.checkers, r.checkers))
    }
}
