import type { JsTypeName } from "@re-/tools"
import type { Check } from "../../traverse/exports.js"
import type {
    KeywordDefinition,
    SubtypeDefinition,
    TypeKeyword
} from "./keyword.js"

export type NormalizedJsTypeName = JsTypeName | "null"

export type KeywordTypeDiagnostic = Check.DefineDiagnostic<
    "keyword",
    {
        definition: KeywordDefinition
        typeKeyword: TypeKeyword
        data: unknown
        actual: NormalizedJsTypeName
    }
>

type AddTypeKeywordDiagnosticSignatures = {
    (args: Check.CheckArgs, definition: TypeKeyword, reason: string): void
    (
        args: Check.CheckArgs,
        definition: SubtypeDefinition,
        reason: string,
        parentKeyword: TypeKeyword
    ): void
}

export const addTypeKeywordDiagnostic: AddTypeKeywordDiagnosticSignatures = (
    ...diagnosticArgs: any[]
) => {
    const [args, definition, reason] = diagnosticArgs as [
        Check.CheckArgs,
        KeywordDefinition,
        string
    ]
    const data = args.data
    args.diagnostics.add(
        "keyword",
        { reason, args },
        {
            definition,
            data,
            actual: data === null ? "null" : typeof args.data,
            typeKeyword: diagnosticArgs[3] ?? definition
        }
    )
}
