import type { Dictionary, NormalizedJsTypeName } from "@re-/tools"
import { jsTypeOf } from "@re-/tools"
import type { Check } from "../traverse/check/check.js"

export const checkObjectKind = <ExpectedStructure extends ObjectKind>(
    definition: string,
    expectedStructure: ExpectedStructure,
    state: Check.State
): state is Check.State<
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

export type StructureDiagnostic = Check.ConfigureDiagnostic<{
    definition: string
    data: unknown
    expected: ObjectKind
    actual: NormalizedJsTypeName
}>
