import type { Narrow } from "@re-/tools"
import type { OptionsByDiagnostic } from "../nodes/traverse/check/diagnostics.js"

export type Context = {
    errors?: OptionsByDiagnostic
}

export const scope = <Def>(definition: Narrow<Def>, context: Context) => [
    definition,
    "$",
    context
]
