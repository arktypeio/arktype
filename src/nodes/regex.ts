import { intersectUniqueLists } from "./../utils/generics.ts"
import type { CompilationState } from "./node.ts"
import { Node } from "./node.ts"

export class RegexNode extends Node<typeof RegexNode> {
    constructor(rule: string[]) {
        super(RegexNode, rule)
    }

    static compile(definition: string[], c: CompilationState) {
        return definition
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

    static intersection(l: RegexNode, r: RegexNode) {
        return new RegexNode(intersectUniqueLists(l.rule, r.rule))
    }
}
