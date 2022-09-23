import type { JsTypeName } from "@re-/tools"
import type { Allows } from "../../allows.js"
import type {
    KeywordDefinition,
    SubtypeDefinition,
    TypeKeyword
} from "./keyword.js"

export type NormalizedJsTypeName = JsTypeName | "null"

export type KeywordTypeDiagnostic = Allows.DefineDiagnostic<
    "keyword",
    {
        definition: KeywordDefinition
        typeKeyword: TypeKeyword
        data: unknown
        actual: NormalizedJsTypeName
    }
>

type AddTypeKeywordDiagnosticSignatures = {
    (args: Allows.Args, definition: TypeKeyword, reason: string): void
    (
        args: Allows.Args,
        definition: SubtypeDefinition,
        reason: string,
        parentKeyword: TypeKeyword
    ): void
}

export const addTypeKeywordDiagnostic: AddTypeKeywordDiagnosticSignatures = (
    ...diagnosticArgs: any[]
) => {
    const [args, definition, reason] = diagnosticArgs as [
        Allows.Args,
        KeywordDefinition,
        string
    ]
    const data = args.data
    args.diagnostics.add("keyword", reason, args, {
        definition,
        data,
        actual: data === null ? "null" : typeof args.data,
        typeKeyword: diagnosticArgs[3] ?? definition
    })
}
