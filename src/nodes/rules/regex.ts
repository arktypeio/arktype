import { intersectUniqueLists } from "../../utils/generics.ts"
import type { CompilationState } from "../node.ts"
import { Node } from "../node.ts"

export class RegexNode extends Node<string[]> {
    constructor(public readonly sources: string[]) {
        super(sources, RegexNode)
    }

    static compile(sources: string[], c: CompilationState) {
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

    static intersect(l: string[], r: string[]) {
        return intersectUniqueLists(l, r)
    }
}
