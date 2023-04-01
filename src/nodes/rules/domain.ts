import type { Domain } from "../../utils/domains.ts"
import type { ComparisonState, CompilationState } from "../node.ts"
import { Node } from "../node.ts"

export class DomainNode extends Node<typeof DomainNode> {
    constructor(public readonly constraint: Domain) {
        super(DomainNode, constraint)
    }

    static intersect(l: DomainNode, r: DomainNode, s: ComparisonState) {
        return l === r ? l : s.addDisjoint("domain", l, r)
    }

    static compile(constraint: Domain, s: CompilationState) {
        return constraint === "object"
            ? `(typeof ${s.data} === "object" && ${s.data} !== null) || typeof ${s.data} === "function"`
            : constraint === "null" || constraint === "undefined"
            ? `${s.data} === ${constraint}`
            : `typeof ${s.data} === "${constraint}"`
    }
}
