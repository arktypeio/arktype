import type { JsBuiltinTypes, JsTypeName } from "@re-/tools"
import { toString } from "@re-/tools"
import type { TypeOptions } from "../../../type.js"
import { TraversalState } from "../traverse.js"
import { Diagnostics } from "./diagnostics.js"
import type { NarrowFn, OptionsByDiagnostic } from "./exports.js"

export type CheckOptions<Inferred = unknown> = {
    narrow?: NarrowFn<Inferred>
    errors?: OptionsByDiagnostic
}

export class CheckState<Data = unknown> extends TraversalState {
    errors: Diagnostics = new Diagnostics()
    checkedValuesByAlias: Record<string, object[]>

    constructor(public data: Data, options: TypeOptions) {
        super(options)
        this.checkedValuesByAlias = {}
    }

    dataIsOfType<TypeName extends JsTypeName>(
        typeName: TypeName
    ): this is CheckState<JsBuiltinTypes[TypeName]> {
        // In JS, typeof null === "object", but in TS null is not assignable to
        // object. To avoid false positives, we just avoid narrowing based on null.
        return this.data === null ? false : typeof this.data === typeName
    }
}

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
