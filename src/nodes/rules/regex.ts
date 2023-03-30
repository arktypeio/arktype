import { intersectUniqueLists } from "../../utils/generics.ts"
import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { registerRegex } from "../registry.ts"

export class RegexNode extends Node<RegexNode> {
    constructor(public definition: string[]) {
        super(
            JSON.stringify(
                definition.length === 1 ? definition[0] : definition.sort()
            )
        )
    }

    intersect(other: RegexNode) {
        return new RegexNode(
            intersectUniqueLists(this.definition, other.definition)
        )
    }

    compile(c: Compilation): string {
        return this.definition
            .map(
                (source) =>
                    `${registerRegex(source)}.test(${c.data}) || ${c.problem(
                        "regex",
                        "`" + source + "`"
                    )}` as const
            )
            .join(";")
    }
}
