import { throwInternalError } from "../utils/errors.js"
import { intersectUniqueLists } from "./../utils/generics.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class RegexNode extends Node<typeof RegexNode> {
    constructor(sources: string | string[]) {
        super(
            RegexNode,
            typeof sources === "string"
                ? [sources]
                : sources.length === 0
                ? throwInternalError(`Unexpectedly received empty regex list`)
                : sources
        )
    }

    static compile(sources: string[]) {
        return sources
            .sort()
            .map((source): CompiledAssertion => `!data.match(/${source}/)`)
            .join(" || ") as CompiledAssertion
    }

    intersect(other: RegexNode) {
        return new RegexNode(intersectUniqueLists(this.child, other.child))
    }
}
