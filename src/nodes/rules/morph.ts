import type { Morph } from "../../parse/ast/morph.ts"
import { intersectUniqueLists } from "../../utils/generics.ts"
import type { CompilationState } from "../node.ts"
import { Node } from "../node.ts"

export class MorphNode extends Node<typeof MorphNode> {
    constructor(public predicates: Morph[]) {
        super(MorphNode, predicates)
    }

    static compile(sources: Morph[], c: CompilationState) {
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

    static intersect(l: MorphNode, r: MorphNode) {
        return new MorphNode(intersectUniqueLists(l.predicates, r.predicates))
    }
}
