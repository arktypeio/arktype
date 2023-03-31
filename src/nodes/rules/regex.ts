import { intersectUniqueLists } from "../../utils/generics.ts"
import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { registerRegex } from "../registry.ts"

export class RegexNode extends Node {
    constructor(public sources: string[]) {
        super(
            JSON.stringify(sources.length === 1 ? sources[0] : sources.sort())
        )
    }

    intersect(other: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.sources, other.sources))
    }

    compile(c: Compilation): string {
        return this.sources
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
