import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/exports.js"
import type { TypeKeyword } from "./keyword.js"

export const addTypeKeywordDiagnostic = (
    state: Check.CheckState,
    keyword: TypeKeyword.Definition,
    reason: string
) => {
    state.errors.add(
        "typeKeyword",
        { reason, state },
        {
            keyword,
            data: state.data,
            actual: jsTypeOf(state.data)
        }
    )
}
