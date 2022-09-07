import { Evaluate, toString, uncapitalize } from "@re-/tools"
import type {
    ExtraneousKeysDiagnostic,
    MissingKeyDiagnostic
} from "../../obj/record.js"
import type { TupleLengthDiagnostic } from "../../obj/tuple.js"
import type { RegexMismatchDiagnostic } from "../../str/operand/index.js"
import type { BoundViolationDiagnostic } from "../../str/operator/bound/bound.js"
import type { UnionDiagnostic } from "../../str/operator/exports.js"
import type { base } from "../base.js"
import * as Traverse from "./traverse.js"

export type Args<Data = unknown> = {
    data: Data
    diagnostics: Diagnostics
    cfg: Options
    ctx: Context
}

export const createArgs = (
    data: unknown,
    options: Options = {},
    modelOptions: Options = {}
): Args => {
    const args = {
        data,
        diagnostics: new Diagnostics(),
        ctx: Traverse.createContext(modelOptions) as Context,
        cfg: options
    }
    args.ctx.checkedValuesByAlias = {}
    return args
}

export type Options = {
    validator?: CustomValidator | "default"
    diagnostics?: OptionsByDiagnostic
}

export type Context = Traverse.Context<Options> & {
    checkedValuesByAlias: Record<string, object[]>
}

export type CustomValidator = (
    args: CustomValidatorArgs
) => undefined | string | string[]

export type CustomValidatorArgs = Evaluate<
    BaseErrorContext & {
        getOriginalErrors: () => Diagnostics
    }
>

export const customValidatorAllows = (
    validator: CustomValidator,
    node: base,
    args: Args
): boolean => {
    const context = createBaseErrorContext(node, args)
    const result = getCustomErrorMessages(validator, node, args, context)
    const customMessages = typeof result === "string" ? [result] : result
    if (Array.isArray(customMessages)) {
        for (const message of customMessages) {
            args.diagnostics.push(
                new CustomDiagnostic(node.toString(), args, message)
            )
        }
        return false
    }
    return true
}

export const getCustomErrorMessages = (
    validator: CustomValidator,
    node: base,
    args: Args,
    context: BaseErrorContext
) =>
    validator({
        ...context,
        getOriginalErrors: () => {
            const diagnostics = new Diagnostics()
            node.allows({
                ...args,
                cfg: { ...args.cfg, validator: "default" },
                diagnostics
            })
            return diagnostics
        }
    })

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })

export type BaseErrorContext = {
    path: Traverse.Path
    definition: string
    tree: unknown
    data: unknown
}

export const createBaseErrorContext = (
    node: base,
    args: Args
): BaseErrorContext => ({
    definition: node.toString(),
    data: args.data,
    path: args.ctx.path,
    tree: node.tree
})

export type BaseDiagnosticOptions<Code extends keyof DiagnosticsByCode> = {
    message?: (context: DiagnosticsByCode[Code]) => string
}

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: BaseDiagnosticOptions<Code> &
        DiagnosticsByCode[Code]["options"]
}

export type DiagnosticsByCode = {
    Unassignable: UnassignableDiagnostic
    BoundViolation: BoundViolationDiagnostic
    ExtraneousKeys: ExtraneousKeysDiagnostic
    MissingKey: MissingKeyDiagnostic
    Custom: CustomDiagnostic
    RegexMismatch: RegexMismatchDiagnostic
    TupleLength: TupleLengthDiagnostic
    Union: UnionDiagnostic
}

export type DiagnosticCode = keyof DiagnosticsByCode

export type RegisteredDiagnostic = DiagnosticsByCode[DiagnosticCode]

export abstract class Diagnostic<
    Code extends keyof DiagnosticsByCode,
    AdditionalOptions = {}
> {
    path: Traverse.Path
    data: unknown
    options: (BaseDiagnosticOptions<Code> & AdditionalOptions) | undefined

    constructor(public readonly code: Code, public type: string, args: Args) {
        this.path = args.ctx.path
        this.data = args.data
        this.options = args.cfg.diagnostics?.[this.code] as any
    }

    abstract message: string
}

export class ValidationError extends Error {}

export class UnassignableDiagnostic extends Diagnostic<"Unassignable"> {
    public message: string

    constructor(type: string, args: Args) {
        super("Unassignable", type, args)
        this.message = `${stringifyData(this.data)} is not assignable to ${
            this.type
        }.`
    }
}

export class CustomDiagnostic extends Diagnostic<"Custom"> {
    constructor(type: string, args: Args, public message: string) {
        super("Custom", type, args)
    }
}

export class Diagnostics extends Array<RegisteredDiagnostic> {
    push(...diagnostics: RegisteredDiagnostic[]) {
        for (const diagnostic of diagnostics) {
            if (diagnostic.options?.message) {
                diagnostic.message = diagnostic.options.message(
                    diagnostic as any
                )
            }
            this[this.length] = diagnostic
        }
        return this.length
    }

    get summary() {
        if (this.length === 1) {
            const error = this[0]
            if (error.path.length) {
                return `At path ${error.path.join("/")}, ${uncapitalize(
                    error.message
                )}`
            }
            return error.message
        }
        let aggregatedMessage = "Encountered errors at the following paths:\n"
        for (const error of this) {
            // Display root path as "/"
            aggregatedMessage += `  ${
                error.path.length ? error.path.join("/") : "/"
            }: ${error.message}\n`
        }
        return aggregatedMessage
    }
}
