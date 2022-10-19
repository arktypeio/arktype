import type { NormalizedJsTypeOf } from "@arktype/tools"
import { jsTypeOf, uncapitalize } from "@arktype/tools"
import type { Base } from "../nodes/base/base.js"
import { pathToString, stringifyData } from "../nodes/base/base.js"
import { isIntegerLike } from "../parser/str/operand/numeric.js"

export type Stringifiable<Data> = {
    raw: Data
    typeOf: NormalizedJsTypeOf<Data>
    toString(): string
}

const stringifiableFrom = <Data>(raw: Data) => ({
    raw,
    typeOf: jsTypeOf(raw),
    toString: () => stringifyData(raw)
})

export class Problem<Code extends ProblemCode> {
    data: Stringifiable<Data>
    private branchPath: string[]
    protected omitActualByDefault?: true

    constructor(
        public code: Code,
        public type: Base.Node,
        public path: string
    ) {
        this.data = stringifiableFrom(state.data)
        this.branchPath = state.branchPath
        this.options = (state.scopes.query("errors", this.code) as any) ?? {}
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

export type ProblemKinds = {
    type: {}
    regex: {}
    numberSubtype: {}
    divisibility: {}
    bound: {}
    multiple: {}
}

export type ProblemCode = keyof ProblemKinds

export class ArktypeError extends TypeError {
    cause: List

    constructor(problems: List) {
        super(problems.summary)
        this.cause = problems
    }
}

export class List extends Array<Problem<ProblemCode>> {
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
