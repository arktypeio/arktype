import type { Morph } from "../parse/ast/morph.js"
import { intersectUniqueLists } from "../utils/generics.js"
import type { CompilationState } from "./node.js"
import { Node } from "./node.js"

export class MorphNode extends Node<typeof MorphNode> {
    constructor(public rule: Morph[]) {
        super(MorphNode, rule)
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
        return new MorphNode(intersectUniqueLists(l.rule, r.rule))
    }
}
