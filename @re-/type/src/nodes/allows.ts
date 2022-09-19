import type { Evaluate } from "@re-/tools"
import { toString, uncapitalize } from "@re-/tools"
import type { Base } from "./base.js"
import type { Path } from "./common.js"
import { pathToString } from "./common.js"
import type { BoundViolationDiagnostic } from "./constraints/bounds.js"
import type { UnionDiagnostic } from "./expressions/branches/union.js"
import type { ObjectKindDiagnostic } from "./structures/common.js"
import type {
    ExtraneousKeysDiagnostic,
    MissingKeyDiagnostic
} from "./structures/dictionary.js"
import type { TupleLengthDiagnostic } from "./structures/tuple.js"
import type { KeywordDiagnostic } from "./terminals/keywords/common.js"
import type { Keyword } from "./terminals/keywords/keyword.js"
import type { NumberSubtypeDiagnostic } from "./terminals/keywords/number.js"
import type { RegexMismatchDiagnostic } from "./terminals/keywords/string.js"
import type { LiteralDiagnostic } from "./terminals/literal.js"
import { Traverse } from "./traverse.js"

export namespace Allows {
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
        node: Base.node,
        args: Args
    ): boolean => {
        const context = createBaseErrorContext(node, args)
        const result = getCustomErrorMessages(validator, node, args, context)
        const customMessages = typeof result === "string" ? [result] : result
        if (Array.isArray(customMessages)) {
            for (const message of customMessages) {
                args.diagnostics.push(new CustomDiagnostic(args, message))
            }
            return false
        }
        return true
    }

    export const getCustomErrorMessages = (
        validator: CustomValidator,
        node: Base.node,
        args: Args,
        context: BaseErrorContext
    ) =>
        validator({
            ...context,
            getOriginalErrors: () => {
                const diagnostics = new Diagnostics()
                node.check({
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
        path: Path
        definition: string
        tree: unknown
        data: unknown
    }

    export const createBaseErrorContext = (
        node: Base.node,
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
        Literal: LiteralDiagnostic
        Keyword: KeywordDiagnostic
        ObjectKind: ObjectKindDiagnostic
        BoundViolation: BoundViolationDiagnostic
        ExtraneousKeys: ExtraneousKeysDiagnostic
        MissingKey: MissingKeyDiagnostic
        Custom: CustomDiagnostic
        NumberSubtype: NumberSubtypeDiagnostic
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
        path: Path
        data: unknown
        options: (BaseDiagnosticOptions<Code> & AdditionalOptions) | undefined

        constructor(public readonly code: Code, args: Args) {
            this.path = args.ctx.path
            this.data = args.data
            this.options = args.cfg.diagnostics?.[code] as any
        }

        abstract message: string
    }

    export class ValidationError extends Error {}

    export type TypeSetName = Keyword.Definition | "array"

    export class CustomDiagnostic extends Diagnostic<"Custom"> {
        constructor(args: Args, public message: string) {
            super("Custom", args)
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
                    return `${pathToString(error.path)} ${uncapitalize(
                        error.message
                    )}`
                }
                return error.message
            }
            let aggregatedMessage =
                "Encountered errors at the following paths:\n"
            for (const error of this) {
                aggregatedMessage += `  ${pathToString(error.path)}: ${
                    error.message
                }\n`
            }
            return aggregatedMessage
        }
    }
}
