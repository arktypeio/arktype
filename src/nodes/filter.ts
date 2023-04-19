import type { Filter } from "../parse/ast/filter.js"
import { intersectUniqueLists, listFrom } from "../utils/generics.js"
import type { CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class FilterNode extends Node<typeof FilterNode> {
    readonly kind = "filter"
    predicates: readonly Filter[]

    constructor(predicates: Filter | Filter[]) {
        const predicateList = listFrom(predicates)
        super(FilterNode, predicateList)
        this.predicates = predicateList
    }

    static compile(predicates: readonly Filter[]): CompiledAssertion {
        return `data !== data`
    }

    intersect(other: FilterNode) {
        return new FilterNode(
            intersectUniqueLists(this.predicates, other.predicates)
        )
    }
}
