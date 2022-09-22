import type { InstanceOf } from "@re-/tools"
import { isKeyOf } from "@re-/tools"
import type { Allows } from "../../allows.js"
import type {
    KeywordDefinition,
    SubtypeDefinition,
    SubtypeKeyword,
    TypeKeyword
} from "./keyword.js"
import { StringNode, stringTypedKeywords } from "./string.js"

export type KeywordTypeDiagnostic = Allows.DefineDiagnostic<
    "keyword",
    {
        definition: KeywordDefinition
        typeKeyword: TypeKeyword
        data: unknown
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
    args.diagnostics.add("keyword", args, {
        definition,
        data: args.data,
        reason,
        typeKeyword: diagnosticArgs[3] ?? definition
    })
}
