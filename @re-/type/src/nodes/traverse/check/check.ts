import type { NormalizedJsTypeName, NormalizedJsTypes } from "@re-/tools"
import { hasJsType, toString } from "@re-/tools"
import type { TypeOptions } from "../../../scopes/type.js"
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

    dataIsOfType<TypeName extends NormalizedJsTypeName>(
        typeName: TypeName
    ): this is CheckState<NormalizedJsTypes[TypeName]> {
        return hasJsType(this.data, typeName)
    }
}

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
