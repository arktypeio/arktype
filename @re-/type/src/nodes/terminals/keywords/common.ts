import type { NormalizedJsTypeName } from "@re-/tools"
import type { Check } from "../../traverse/exports.js"
import type {
    KeywordDefinition,
    SubtypeDefinition,
    TypeKeyword
} from "./keyword.js"

export type KeywordTypeDiagnostic = Check.DiagnosticConfig<{
    definition: KeywordDefinition
    typeKeyword: TypeKeyword
    data: unknown
    actual: NormalizedJsTypeName
}>

type AddTypeKeywordDiagnosticSignatures = {
    (state: Check.CheckState, definition: TypeKeyword, reason: string): void
    (
        state: Check.CheckState,
        definition: SubtypeDefinition,
        reason: string,
        parentKeyword: TypeKeyword
    ): void
}

export const addTypeKeywordDiagnostic: AddTypeKeywordDiagnosticSignatures = (
    ...diagnosticArgs: any[]
) => {
    const [args, definition, reason] = diagnosticArgs as [
        Check.CheckState,
        KeywordDefinition,
        string
    ]
    const data = args.data
    args.errors.add(
        "keyword",
        { reason, state: args },
        {
            definition,
            data,
            actual: data === null ? "null" : typeof args.data,
            typeKeyword: diagnosticArgs[3] ?? definition
        }
    )
}
