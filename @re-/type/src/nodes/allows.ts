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
import type { BoundDiagnosticContext, BoundKind } from "./constraints/bounds.js"
import type { BranchDiagnosticsEntry } from "./expressions/branches/union.js"
import type { StructKind } from "./structs/struct.js"
import type { Keyword, TypeKeyword } from "./terminals/keywords/keyword.js"
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
        message?: (context: DiagnosticCustomizationsByCode[Code]) => string
        includeDataInMessage?: boolean
    }

    type OptionsByDiagnostic = {
        [Code in DiagnosticCode]?: "options" extends keyof DiagnosticCustomizationsByCode[Code]
            ? BaseDiagnosticOptions<Code> &
                  Partial<DiagnosticCustomizationsByCode[Code]["options"]>
            : BaseDiagnosticOptions<Code>
    }

    type BaseDiagnosticContextInput = {
        reason: string
    }

    export type ContextInputByDiagnostic = {
        [Code in DiagnosticCode]: "context" extends keyof DiagnosticCustomizationsByCode[Code]
            ? BaseDiagnosticContextInput &
                  DiagnosticCustomizationsByCode[Code]["context"]
            : BaseDiagnosticContextInput
    }

    export type DiagnosticCustomizationsByCode = {
        keyword: {
            context: {
                base?: TypeKeyword
            }
        }
        literal: {}
        structure: {
            context: {
                kind: StructKind
            }
        }
        bound: {
            context: BoundDiagnosticContext
        }
        extraneousKeys: {
            options: {
                enabled: boolean
            }
            context: {
                keys: string[]
            }
        }
        missingKey: {
            context: {
                key: string
            }
        }
        regex: {
            context: {
                expression: RegExp
            }
        }
        tupleLength: {
            context: {
                expected: number
                actual: number
            }
        }
        union: {
            options: {
                explainBranches: boolean
            }
            context: {
                branchDiagnosticsEntries: BranchDiagnosticsEntry[]
            }
        }
        intersection: {}
    }

    export type DiagnosticCode = keyof DiagnosticCustomizationsByCode

    export type RegisteredDiagnostic = Diagnostic<DiagnosticCode>

    export type DiagnosticArgs<Code extends DiagnosticCode> = [
        code: Code,
        definition: unknown,
        args: Args,
        context: ContextInputByDiagnostic[Code]
    ]

    export class Diagnostic<Code extends DiagnosticCode> {
        readonly code: Code
        definition: unknown
        message: string
        path: Path
        data: unknown
        options: OptionsByDiagnostic[Code]

        constructor(
            ...[code, definition, args, context]: DiagnosticArgs<Code>
        ) {
            this.code = code
            this.path = args.ctx.path
            this.definition = definition
            this.data = args.data
            this.options = args.cfg.diagnostics?.[code] ?? {}
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
            Object.assign(this, context)
        }
    }

    export class ValidationError extends Error {}

    export type TypeSetName = Keyword.Definition | "array"

    export class Diagnostics extends Array<RegisteredDiagnostic> {
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
