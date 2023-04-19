import { throwInternalError } from "../utils/errors.js"
import { intersectUniqueLists, listFrom } from "./../utils/generics.js"
import type { CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class RegexNode extends Node<typeof RegexNode> {
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
            .map((source): CompiledAssertion => `data.match(/${source}/)`)
            .join(" && ") as CompiledAssertion
    }

    intersect(other: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.sources, other.sources))
    }
}
