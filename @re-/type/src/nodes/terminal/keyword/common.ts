import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import type { TypeKeyword } from "./keyword.js"

export const addTypeKeywordDiagnostic = (
    state: Check.State,
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
