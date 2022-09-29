import type { Dictionary, NormalizedJsTypeName, UnionToTuple } from "@re-/tools"
import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/exports.js"

export const checkObjectKind = <ExpectedStructure extends ObjectKind>(
    definition: string,
    expectedStructure: ExpectedStructure,
    state: Check.CheckState
): state is Check.CheckState<
    ExpectedStructure extends "array" ? unknown[] : Dictionary
> => {
    const actual = jsTypeOf(state.data)
    if (expectedStructure !== actual) {
        const expectedStructureDescription =
            expectedStructure === "array" ? "an array" : "a non-array object"
        state.errors.add(
            "structure",
            {
                reason: `Must be ${expectedStructureDescription}`,
                state
            },
            {
                definition,
                data: state.data,
                expected: expectedStructure,
                actual
            }
        )
        return false
    }
    return true
}

export type ObjectKind = "object" | "array"

export type StructureDiagnostic = Check.DiagnosticConfig<{
    definition: string
    data: unknown
    expected: ObjectKind
    actual: NormalizedJsTypeName
}>
