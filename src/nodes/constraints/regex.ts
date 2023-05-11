import { throwInternalError } from "../../utils/errors.js"
import type { listable } from "../../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import { type CompilationState, In } from "../compilation.js"
import { Node } from "../node.js"

export class RegexNode extends Node<"regex"> {
    static readonly kind = "regex"
    sources: readonly string[]

    constructor(sources: listable<string>) {
        const sourceList = listFrom(sources)
        if (sourceList.length === 0) {
            throwInternalError(`Unexpectedly received empty regex list`)
        }
        super("regex", RegexNode.compile(sourceList))
        this.sources = sourceList
    }

    static compile(sources: readonly string[]) {
        return [...sources]
            .sort()
            .map(RegexNode.#compileExpression)
            .join(" && ")
    }

    static #compileExpression(source: string) {
        return `${In}.match(/${source}/)`
    }

    toString() {
        const literals = this.sources.map((_) => `/${_}/`)
        return literals.length === 1
            ? literals[0]
            : `expressions ${literals.join(", ")}`
    }

    compileTraverse(s: CompilationState) {
        return this.sources
            .map((source) =>
                s.ifNotThen(
                    RegexNode.#compileExpression(source),
                    s.problem("regex", source)
                )
            )
            .join("\n")
    }

    intersectNode(r: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.sources, r.sources))
    }
}
