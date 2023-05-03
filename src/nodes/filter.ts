import type { Filter } from "../parse/ast/filter.js"
import { intersectUniqueLists, listFrom } from "../utils/lists.js"
import type { CompilationState } from "./compilation.js"
import { Node } from "./node.js"

export class FilterNode extends Node<"filter"> {
    static readonly kind = "filter"
    predicates: readonly Filter[]

    constructor(predicates: Filter | Filter[]) {
        const predicateList = listFrom(predicates)
        super(FilterNode, predicateList)
        this.predicates = predicateList
    }

    static compile(predicates: readonly Filter[]) {
        return "false"
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("custom", "filters"))
    }

    static intersect(l: FilterNode, r: FilterNode) {
        return new FilterNode(intersectUniqueLists(l.predicates, r.predicates))
    }
}
