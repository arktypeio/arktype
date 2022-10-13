import { toString, uncapitalize } from "@re-/tools"
import { isIntegerLike } from "../../parser/str/operand/numeric.js"
import { pathToString } from "../base.js"
import type { Base } from "../base.js"
import type { Check } from "./check.js"

export type Stringifiable<Data> = {
    raw: Data
    toString(): string
}

const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })

const stringifiableFrom = <Data>(raw: Data) => ({
    raw,
    toString: () => stringifyData(raw)
})

export abstract class Diagnostic<Node extends Base.UnknownNode> {
    data: Stringifiable<Data>
    path: string[]
    private unionDepth: number
    protected omitActualByDefault?: true

    constructor(public type: Node, state: Check.State) {
        this.data = stringifiableFrom(state.data as Data)
        this.path = [...state.path]
        this.unionDepth = state.unionDepth
        this.options = (state.queryContext("errors", this.code) as any) ?? {}
    }

    get defaultMessage() {
        let message = `Must be ${this.conditionDescription}`
        if (!this.options.omitActual) {
            if ("actual" in context) {
                message += ` (was ${context.actual})`
            } else if (
                !this.omitActualByDefault &&
                // If we're in a union, don't redundandtly include data (other
                // "actual" context is still included)
                !this.unionDepth
            ) {
                message += ` (was ${this.data.toString()})`
            }
        }
        return message
    }

    get message() {
        let result = this.options.message?.(this) ?? this.defaultMessage
        if (this.unionDepth) {
            const branchIndentation = "  ".repeat(this.unionDepth)
            result = branchIndentation + result
        }
        return result
    }
}

export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
    constructor(private state: Check.State) {
        super()
    }

    add<Code extends DiagnosticCode>(
        code: Code,
        context: DiagnosticContextConfig<Code>
    ) {
        const raw = this.state.data
        const baseContext: BaseDiagnosticContext<Base.UnknownNode, unknown> = {
            path: [...this.state.path],
            data: stringifiableFrom(raw)
        }
        const options = this.state.queryContext("errors", code) as
            | UniversalDiagnosticOptions
            | undefined

        if (options?.message) {
            context.message = options?.message(context)
        }

        this.push(context)
    }

    get summary() {
        if (this.length === 1) {
            const error = this[0]
            if (error.path.length) {
                const pathPrefix =
                    error.path.length === 1 && isIntegerLike(error.path[0])
                        ? `Value at index ${error.path[0]}`
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
    cause: Diagnostics

    constructor(diagnostics: Diagnostics) {
        super(diagnostics.summary)
        this.cause = diagnostics
    }
}
