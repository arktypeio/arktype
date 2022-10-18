import { uncapitalize } from "@arktype/tools"
import type { Base } from "../nodes/base.js"
import { pathToString, stringifyData } from "../nodes/base.js"
import { isIntegerLike } from "../parse/str/operand/numeric.js"
import type { TraversalState } from "./traversal.js"

export type Stringifiable<Data> = {
    raw: Data
    toString(): string
}

const stringifiableFrom = <Data>(raw: Data) => ({
    raw,
    toString: () => stringifyData(raw)
})

export class Problem<Node extends Base.Node> {
    data: Stringifiable<Data>
    path: string[]
    private branchPath: string[]
    protected omitActualByDefault?: true

    constructor(public type: Node, traversal: TraversalState) {
        this.data = stringifiableFrom(traversal.data)
        this.path = [...traversal.path]
        this.branchPath = traversal.branchPath
        this.options =
            (traversal.scopes.query("errors", this.code) as any) ?? {}
    }

    get defaultMessage() {
        let message = `Must be ${this.type.mustBe}`
        if (!this.options.omitActual) {
            if ("actual" in context) {
                message += ` (was ${context.actual})`
            } else if (
                !this.omitActualByDefault &&
                // If we're in a union, don't redundandtly include data (other
                // "actual" context is still included)
                !this.branchPath.length
            ) {
                message += ` (was ${this.data.toString()})`
            }
        }
        return message
    }

    get message() {
        let result = this.options.message?.(this) ?? this.defaultMessage
        if (this.branchPath.length) {
            const branchIndentation = "  ".repeat(this.branchPath.length)
            result = branchIndentation + result
        }
        return result
    }
}

export class ProblemSet {
    constructor() {}
}

export class Problems extends Array<Problem<Base.Node>> {
    add(node: Base.Node): false {
        return false
    }

    get summary() {
        if (this.length === 1) {
            const error = this[0]
            if (error.path.length) {
                const pathPrefix =
                    error.path.length === 1 && isIntegerLike(error.path[0])
                        ? `Item ${error.path[0]}`
                        : pathToString(error.path)
                return `${pathPrefix} ${uncapitalize(error.message)}`
            }
            return error.message
        }
        let aggregatedMessage = ""
        for (const error of this) {
            aggregatedMessage += `${pathToString(error.path)}: ${
                error.message
            }\n`
        }
        return aggregatedMessage.slice(0, -1)
    }

    throw() {
        throw new ArktypeError(this)
    }
}

export class ArktypeError extends TypeError {
    cause: Problems

    constructor(diagnostics: Problems) {
        super(diagnostics.summary)
        this.cause = diagnostics
    }
}
