import type { Evaluate } from "@re-/tools"
import { toString, uncapitalize } from "@re-/tools"
import type { Base } from "./base.js"
import type { Path } from "./common.js"
import { pathToString } from "./common.js"
import type { Keyword } from "./terminals/keywords/keyword.js"
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
        BaseDiagnosticContext & {
            getOriginalErrors: () => Diagnostics
        }
    >

    export const customValidatorAllows = (
        validator: CustomValidator,
        node: Base.node,
        args: Args
    ): boolean => {
        const context = createBaseDiagnosticContext(node, args)
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
        context: BaseDiagnosticContext
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

    export type BaseDiagnosticOptions<
        Code extends DiagnosticCode = DiagnosticCode
    > = {
        message?: (context: DiagnosticCustomizationsByCode[Code]) => string
        includeActual?: boolean
    }

    type OptionsByDiagnostic = {
        [Code in DiagnosticCode]?: "options" extends keyof DiagnosticCustomizationsByCode[Code]
            ? BaseDiagnosticOptions<Code> &
                  DiagnosticCustomizationsByCode[Code]["options"]
            : BaseDiagnosticOptions<Code>
    }

    type BaseDiagnosticContextInput = { reason: string; actual?: unknown }

    type ContextInputByDiagnostic = {
        [Code in DiagnosticCode]: "context" extends keyof DiagnosticCustomizationsByCode[Code]
            ? BaseDiagnosticContextInput &
                  DiagnosticCustomizationsByCode[Code]["context"]
            : BaseDiagnosticContextInput
    }

    export type DiagnosticCustomizationsByCode = {
        literal: {}
        keyword: {}
        objectKind: {}
        bounds: {}
        extraneousKeys: {}
        missingKey: {}
        regex: {}
        tupleLength: {}
        union: {}
    }

    export type DiagnosticCode = keyof DiagnosticCustomizationsByCode

    export type RegisteredDiagnostic = Diagnostic<DiagnosticCode>

    export class Diagnostic<Code extends DiagnosticCode> {
        message: string
        path: Path
        data: unknown
        options: OptionsByDiagnostic[Code]

        constructor(
            public readonly code: Code,
            public definition: unknown,
            args: Args,
            context: ContextInputByDiagnostic[Code]
        ) {
            this.path = args.ctx.path
            this.data = args.data
            this.options = args.cfg.diagnostics?.[code] ?? {}
            this.message = `${context.reason}${
                this.options?.includeActual
                    ? ` (got ${context.actual ?? stringifyData(args.data)})`
                    : ""
            }.`
            Object.assign(this, context)
        }
    }

    export class ValidationError extends Error {}

    export type TypeSetName = Keyword.Definition | "array"

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
