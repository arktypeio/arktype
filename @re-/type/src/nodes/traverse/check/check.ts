import type {
    Dictionary,
    NormalizedJsTypeName,
    NormalizedJsTypes
} from "@re-/tools"
import { hasJsType } from "@re-/tools"
import type { TypeOptions } from "../../../scopes/type.js"
import type { Base } from "../../base.js"
import type { DiagnosticCode, InternalDiagnosticArgs } from "./diagnostics.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    export type ConfigureDiagnostic<
        Node extends Base.Node,
        Context extends Dictionary = {},
        Options extends Dictionary = {},
        Data = unknown
    > = {
        context: Context & {
            type: Node
            data: Data
        }
        options: Options
    }

    // TODO: Try traversal
    export class State<Data = unknown> {
        errors: Diagnostics
        path: string[] = []
        checkedValuesByAlias: Record<string, object[]>

        constructor(
            public root: Base.Node,
            public data: Data,
            public options: TypeOptions
        ) {
            this.errors = new Diagnostics(this)
            this.checkedValuesByAlias = {}
        }

        dataIsOfType<TypeName extends NormalizedJsTypeName>(
            typeName: TypeName
        ): this is State<NormalizedJsTypes[TypeName]> {
            return hasJsType(this.data, typeName)
        }

        addError<Code extends DiagnosticCode>(
            code: Code,
            input: InternalDiagnosticArgs<Code>
        ) {
            this.errors.add(code, input)
        }
    }
}
