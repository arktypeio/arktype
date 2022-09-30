import type { NormalizedJsTypeName, NormalizedJsTypes } from "@re-/tools"
import { hasJsType, toString } from "@re-/tools"
import type { TypeOptions } from "../../../scopes/type.js"
import type { Base } from "../../base.js"
import type { NarrowFn } from "./customValidator.js"
import type {
    Diagnostic,
    DiagnosticCode,
    InternalDiagnosticInput,
    OptionsByDiagnostic
} from "./diagnostics.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    export type DefineDiagnostic<
        SupplementalContext extends Record<string, unknown>,
        SupplementalOptions extends Record<string, unknown> = {}
    > = {
        context: SupplementalContext
        options: SupplementalOptions
    }

    export type Options<Inferred = unknown> = {
        narrow?: NarrowFn<Inferred>
        errors?: OptionsByDiagnostic
    }

    export class State<Data = unknown> {
        errors: Diagnostics
        path: string[] = []
        checkedValuesByAlias: Record<string, object[]>

        constructor(public data: Data, public options: TypeOptions) {
            this.errors = new Diagnostics(this)
            this.checkedValuesByAlias = {}
        }

        dataIsOfType<TypeName extends NormalizedJsTypeName>(
            typeName: TypeName
        ): this is State<NormalizedJsTypes[TypeName]> {
            return hasJsType(this.data, typeName)
        }

        add<Code extends DiagnosticCode>(
            code: Code,
            context: InternalDiagnosticInput<Code>
        ) {
            const diagnostic = context as Diagnostic<Code>

            this.errors.push(diagnostic)
        }
    }
}
