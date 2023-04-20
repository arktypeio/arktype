import { throwInternalError } from "../utils/errors.js"
import { intersectUniqueLists, listFrom } from "./../utils/generics.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class RegexNode extends Node<typeof RegexNode> {
    static readonly kind = "regex"
    sources: string[]

    constructor(sources: string | string[]) {
        const sourceList = listFrom(sources)
        if (sourceList.length === 0) {
            throwInternalError(`Unexpectedly received empty regex list`)
        }
        super(RegexNode, sourceList)
        this.sources = sourceList
    }

    static compile(sources: string[]) {
        return sources
            .sort()
            .map(RegexNode.#compileOne)
            .join(" && ") as CompiledAssertion
    }

    static #compileOne(source: string): CompiledAssertion {
        return `data.match(/${source}/)`
    }

    compileTraversal(s: CompilationState) {
        return this.sources
            .map((source) =>
                s.ifNotThen(
                    RegexNode.#compileOne(source),
                    s.problem("regex", source)
                )
            )
            .join("\n")
    }

    intersect(other: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.sources, other.sources))
    }
}
