import type {
    Evaluate,
    JsBuiltinTypes,
    JsTypeName,
    Stringifiable
} from "@re-/tools"
import { toString, uncapitalize } from "@re-/tools"
import type { Scanner } from "../parser/str/state/scanner.js"
import type { Base } from "./base.js"
import type { Path } from "./common.js"
import { pathToString } from "./common.js"
import type {
    BoundDiagnostic as BoundDiagnostic,
    BoundKind
} from "./constraints/bounds.js"
import type { UnionDiagnostic } from "./expressions/branches/union.js"
import type { KeywordDiagnostic } from "./terminals/keywords/keyword.js"
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

    export const dataIsOfType = <TypeName extends JsTypeName>(
        args: Allows.Args,
        typeName: TypeName
    ): args is Args<JsBuiltinTypes[TypeName]> => typeof args.data === typeName

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
        message?: (context: RegisteredDiagnostics[Code]) => string
        includeDataInMessage?: boolean
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

    export type RegisteredDiagnostics = {
        keyword: KeywordDiagnostic
        // literal: {}
        // structure: {
        //     context: {
        //         kind: StructKind
        //     }
        // }
        bound: BoundDiagnostic
        // extraneousKeys: {
        //     options: {
        //         enabled: boolean
        //     }
        //     context: {
        //         keys: string[]
        //     }
        // }
        // missingKey: {
        //     context: {
        //         key: string
        //     }
        // }
        // regex: {
        //     context: {
        //         expression: RegExp
        //     }
        // }
        // tupleLength: {
        //     context: {
        //         expected: number
        //         actual: number
        //     }
        // }
        union: UnionDiagnostic
    }

    export type DiagnosticContext<Code extends DiagnosticCode> =
        RegisteredDiagnostics[Code]["context"]

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
        context: DiagnosticContext<Code>
        options: DiagnosticOptions<Code>

        constructor(...[code, args, context]: DiagnosticArgs<Code>) {
            this.code = code
            this.path = args.ctx.path
            this.context = context as DiagnosticContext<Code>
            // TODO: Figure out how to reconcile this and other context sources (cfg vs ctx.modelCfg?)
            this.options = (args.cfg.diagnostics?.[code] ??
                {}) as DiagnosticOptions<Code>
            this.message = `${context.reason}${
                this.options?.includeDataInMessage
                    ? ` (was ${
                          // If we have a context item named "actual", use that
                          // in place of data. This is useful in cases where it
                          // is not the data itself but some property of the
                          // data that resulted in the diagnostic, e.g. the
                          // length of an array.
                          (context as any)?.actual ?? stringifyData(args.data)
                      })`
                    : ""
            }.`
        }
    }

    export class ValidationError extends Error {}

    export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
        add<Code extends DiagnosticCode>(...args: DiagnosticArgs<Code>) {
            const diagnostic = new Diagnostic(...args)
            if (diagnostic.options?.message) {
                diagnostic.message = diagnostic.options.message(diagnostic)
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
