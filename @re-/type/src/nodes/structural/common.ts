import type { Dictionary, NormalizedJsTypeName } from "@re-/tools"
import { jsTypeOf } from "@re-/tools"
import type { Base } from "../base.js"
import type { Arr } from "../nonTerminal/array.js"
import type { Check } from "../traverse/check/check.js"
import type { ObjectLiteral } from "./objectLiteral.js"
import type { Tuple } from "./tuple.js"

export namespace Structural {
    export const checkObjectKind = <ExpectedStructure extends ObjectKind>(
        node: Base.Node,
        expectedStructure: ExpectedStructure,
        state: Check.State
    ): state is Check.State<
        ExpectedStructure extends "array" ? unknown[] : Dictionary
    > => {
        const actual = jsTypeOf(state.data)
        if (expectedStructure !== actual) {
            const expectedStructureDescription =
                expectedStructure === "array"
                    ? "an array"
                    : "a non-array object"
            state.addError("structure", {
                type: node,
                message: `Must be ${expectedStructureDescription}`,
                expected: expectedStructure,
                actual
            })
            return false
        }
        return true
    }

    export type ObjectKind = "object" | "array"

    export type StructureDiagnostic = Check.ConfigureDiagnostic<
        ObjectLiteral.Node | Tuple.Node | Arr.Node,
        {
            expected: ObjectKind
            actual: NormalizedJsTypeName
        }
    >
}
