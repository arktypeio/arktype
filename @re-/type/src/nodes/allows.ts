import type { Evaluate, JsBuiltinTypes, JsTypeName } from "@re-/tools"
import { toString, uncapitalize } from "@re-/tools"
import type { Base } from "./base.js"
import { Path, pathToString } from "./common.js"
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
            if (typeof messageOrCustomResult === "string") {
                args.diagnostics.add(
                    "custom",
                    { reason: messageOrCustomResult, args },
                    {
                        id: "anonymous"
                    }
                )
            } else {
                const { reason, ...context } = messageOrCustomResult
                args.diagnostics.add("custom", { reason, args }, context)
            }
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

    export type DefineDiagnostic<
        Code extends DiagnosticCode,
        Context extends Record<string, unknown>,
        Options extends Record<string, unknown> = {}
    > = {
        context: Context
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
        input: InternalDiagnosticInput,
        context: DiagnosticContext<Code>
    ]

    export type InternalDiagnosticInput = {
        args: Args
        reason: string
        suffix?: string
    }

    export class Diagnostic<Code extends DiagnosticCode> {
        message: string
        path: Path
        context: ExternalDiagnosticContext<Code>
        options: DiagnosticOptions<Code>

        constructor(
            public readonly code: Code,
            { reason, args, suffix }: InternalDiagnosticInput,
            context: DiagnosticContext<Code>
        ) {
            this.path = args.context.path
            this.context = context
            // TODO: Figure out how to reconcile this and other context sources (cfg vs context.modelCfg?)
            this.options = {
                ...args.cfg.diagnostics?.[code],
                ...args.context.modelCfg.diagnostics?.[code]
            }
            this.message = reason
            if (!this.options?.omitActualFromMessage) {
                if ("actual" in context) {
                    this.message += ` (was ${context.actual})`
                }
            }
            if (suffix) {
                this.message += suffix
            }
            if (this.options.message) {
                this.message = this.options.message(this as any)
            }
        }
    }

    export class ValidationError extends Error {}

    export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
        add<Code extends DiagnosticCode>(
            code: Code,
            input: InternalDiagnosticInput,
            context: DiagnosticContext<Code>
        ) {
            this.push(new Diagnostic(code, input, context))
        }

        get summary() {
            if (this.length === 1) {
                const error = this[0]
                if (error.path.length) {
                    const pathPrefix =
                        error.path.length === 1 &&
                        typeof error.path[0] === "number"
                            ? `Value at index ${error.path[0]}`
                            : pathToString(error.path)
                    return `${pathPrefix} ${uncapitalize(error.message)}`
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
