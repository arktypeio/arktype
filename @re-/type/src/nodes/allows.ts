import type { Evaluate, JsBuiltinTypes, JsTypeName } from "@re-/tools"
import { toString, uncapitalize } from "@re-/tools"
import type { Base } from "./base.js"
import type { Path } from "./common.js"
import { pathToString } from "./common.js"
import type { BoundDiagnostic as BoundDiagnostic } from "./constraints/bounds.js"
import type { UnionDiagnostic } from "./expressions/branches/union.js"
import type {
    ExtraneousKeysDiagnostic,
    MissingKeyDiagnostic
} from "./structs/dictionary.js"
import type { StructureDiagnostic } from "./structs/struct.js"
import type { TupleLengthDiagnostic } from "./structs/tuple.js"
import type { KeywordTypeDiagnostic } from "./terminals/keywords/common.js"
import type { NumberSubtypeDiagnostic } from "./terminals/keywords/number.js"
import type { RegexDiagnostic } from "./terminals/keywords/string.js"
import type { LiteralDiagnostic } from "./terminals/literal.js"
import { Traverse } from "./traverse.js"

export namespace Allows {
    export type Args<Data = unknown> = {
        data: Data
        diagnostics: Diagnostics
        cfg: Options
        context: Context
    }

    export const createArgs = (
        data: unknown,
        options: Options = {},
        modelOptions: Options = {}
    ): Args => {
        const args = {
            data,
            diagnostics: new Diagnostics(),
            context: Traverse.createContext(modelOptions) as Context,
            cfg: options
        }
        args.context.checkedValuesByAlias = {}
        return args
    }

    export type Options = {
        validator?: CustomValidator | "default"
        diagnostics?: OptionsByDiagnostic
    }

    export type Context = Traverse.Context<Options> & {
        checkedValuesByAlias: Record<string, object[]>
    }

    export const dataIsOfType = <TypeName extends JsTypeName>(
        args: Allows.Args,
        typeName: TypeName
    ): args is Args<JsBuiltinTypes[TypeName]> => typeof args.data === typeName

    export type CustomDiagnosticResult = {
        id: string
        reason: string
        additionalContext?: Record<string, unknown>
    }

    export type CustomValidator = (
        args: CustomValidatorArgs
    ) =>
        | undefined
        | string
        | string[]
        | CustomDiagnosticResult
        | CustomDiagnosticResult[]

    export type CustomDiagnosticContext = {
        definition: Base.RootDefinition
        data: unknown
        path: Path
    }

    export type CustomValidatorArgs = Evaluate<
        CustomDiagnosticContext & {
            getOriginalErrors: () => Diagnostics
        }
    >

    export const checkCustomValidator = (
        validator: CustomValidator,
        node: Base.node,
        args: Args
    ) => {
        const context: CustomDiagnosticContext = {
            definition: node.definition,
            data: args.data,
            path: args.context.path
        }
        const result = getCustomValidationResult(validator, context, node, args)
        if (result === undefined) {
            return
        }
        const resultsList = !Array.isArray(result) ? [result] : result
        for (const messageOrCustomResult of resultsList) {
            const resultEntry: CustomDiagnosticResult =
                typeof messageOrCustomResult === "string"
                    ? { id: "anonymous", reason: messageOrCustomResult }
                    : messageOrCustomResult
            args.diagnostics.add("custom", args, resultEntry)
        }
    }

    const getCustomValidationResult = (
        validator: CustomValidator,
        context: CustomDiagnosticContext,
        node: Base.node,
        args: Args
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

    export type BaseDiagnosticOptions<Code extends DiagnosticCode> = {
        message?: (context: Diagnostic<Code>) => string
        omitActualFromMessage?: boolean
    }

    type OptionsByDiagnostic = {
        [Code in DiagnosticCode]?: RegisteredDiagnostics[Code]["options"]
    }

    type BaseDiagnosticContext = {
        reason: string
    }

    export type DefineDiagnostic<
        Code extends DiagnosticCode,
        Context extends Record<string, unknown>,
        Options extends Record<string, unknown> = {}
    > = {
        context: Evaluate<BaseDiagnosticContext & Context>
        options: Evaluate<BaseDiagnosticOptions<Code> & Options>
    }

    export type CustomDiagnostic = DefineDiagnostic<
        "custom",
        Omit<CustomDiagnosticResult, "reason">
    >

    export type RegisteredDiagnostics = {
        custom: CustomDiagnostic
        keyword: KeywordTypeDiagnostic
        literal: LiteralDiagnostic
        structure: StructureDiagnostic
        bound: BoundDiagnostic
        extraneousKeys: ExtraneousKeysDiagnostic
        missingKey: MissingKeyDiagnostic
        regex: RegexDiagnostic
        numberSubtype: NumberSubtypeDiagnostic
        tupleLength: TupleLengthDiagnostic
        union: UnionDiagnostic
    }

    export type DiagnosticContext<Code extends DiagnosticCode> =
        RegisteredDiagnostics[Code]["context"]

    export type ExternalDiagnosticContext<Code extends DiagnosticCode> = Omit<
        DiagnosticContext<Code>,
        "reason"
    >

    export type DiagnosticOptions<Code extends DiagnosticCode> =
        RegisteredDiagnostics[Code]["options"]

    export type DiagnosticCode = keyof RegisteredDiagnostics

    export type DiagnosticArgs<Code extends DiagnosticCode> = [
        code: Code,
        args: Args,
        context: DiagnosticContext<Code>
    ]

    export class Diagnostic<Code extends DiagnosticCode> {
        readonly code: Code
        message: string
        path: Path
        context: ExternalDiagnosticContext<Code>
        options: DiagnosticOptions<Code>

        constructor(...[code, args, context]: DiagnosticArgs<Code>) {
            this.code = code
            this.path = args.context.path
            this.context = context
            // TODO: Figure out how to reconcile this and other context sources (cfg vs context.modelCfg?)
            this.options = args.cfg.diagnostics?.[code] ?? {}
            this.message = `${context.reason}${
                this.options?.omitActualFromMessage
                    ? ""
                    : ` (was ${
                          // If we have a context item named "actual", use that
                          // in place of data. This is useful in cases where it
                          // is not the data itself but some property of the
                          // data that resulted in the diagnostic, e.g. the
                          // length of an array.
                          "actual" in context
                              ? context.actual
                              : stringifyData(args.data)
                      })`
            }.`
        }
    }

    export class ValidationError extends Error {}

    export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
        add<Code extends DiagnosticCode>(...args: DiagnosticArgs<Code>) {
            const diagnostic = new Diagnostic(...args)
            if (diagnostic.options?.message) {
                diagnostic.message = diagnostic.options.message(
                    diagnostic as any
                )
            }
            this.push(diagnostic)
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
