import type { Filter } from "../parse/ast/filter.js"
import { intersectUniqueLists, listFrom } from "../utils/generics.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"
import { In } from "./utils.js"

export class FilterNode extends Node<typeof FilterNode> {
    static readonly kind = "filter"
    predicates: readonly Filter[]

    constructor(predicates: Filter | Filter[]) {
        const predicateList = listFrom(predicates)
        super(FilterNode, predicateList)
        this.predicates = predicateList
    }

    static compile(predicates: readonly Filter[]): CompiledAssertion {
        return `${In} !== ${In}`
    }

    compileTraversal(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("custom", "filters"))
    }

    static intersect(l: FilterNode, r: FilterNode) {
        return new FilterNode(intersectUniqueLists(l.predicates, r.predicates))
    }
}
