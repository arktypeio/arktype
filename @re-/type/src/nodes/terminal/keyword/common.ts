import type { NormalizedJsTypeName } from "@re-/tools"
import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/exports.js"
import type { Keyword } from "./keyword.js"

export type KeywordTypeDiagnostic = Check.DiagnosticConfig<{
    keyword: Keyword.Definition
    data: unknown
    actual: NormalizedJsTypeName
}>

export const addTypeKeywordDiagnostic = (
    state: Check.CheckState,
    keyword: Keyword.Definition,
    reason: string
) => {
    state.errors.add(
        "keyword",
        { reason, state },
        {
            keyword,
            data: state.data,
            actual: jsTypeOf(state.data)
        }
    )
}
