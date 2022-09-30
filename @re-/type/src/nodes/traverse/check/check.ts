import type { NormalizedJsTypeName, NormalizedJsTypes } from "@re-/tools"
import { hasJsType, toString } from "@re-/tools"
import type { TypeOptions } from "../../../scopes/type.js"
import type { NarrowFn } from "./customValidator.js"
import type { OptionsByDiagnostic } from "./diagnostics.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    export const Errors = Diagnostics

    export type DefineDiagnostic<
        Context extends Record<string, unknown>,
        Options extends Record<string, unknown> = {}
    > = {
        context: Context
        options: Options
    }

    export type Options<Inferred = unknown> = {
        narrow?: NarrowFn<Inferred>
        errors?: OptionsByDiagnostic
    }

    export class State<Data = unknown> {
        path: string[] = []
        errors = new Errors()
        checkedValuesByAlias: Record<string, object[]>

        constructor(public data: Data, public options: TypeOptions) {
            this.checkedValuesByAlias = {}
        }

        dataIsOfType<TypeName extends NormalizedJsTypeName>(
            typeName: TypeName
        ): this is State<NormalizedJsTypes[TypeName]> {
            return hasJsType(this.data, typeName)
        }
    }

    export const stringifyData = (data: unknown) =>
        toString(data, {
            maxNestedStringLength: 50
        })
}
