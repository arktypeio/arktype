import type { NormalizedJsTypeName, NormalizedJsTypes } from "@re-/tools"
import { hasJsType } from "@re-/tools"
import type { TypeOptions } from "../../../scopes/type.js"
import type { Base } from "../../base.js"
import type {
    BaseDiagnostic,
    DiagnosticCode,
    DiagnosticConfig,
    InternalDiagnosticInput
} from "./diagnostics.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    export type DefineDiagnostic<
        Node extends Base.Node,
        Data,
        Supplemental extends Partial<DiagnosticConfig> = {}
    > = BaseDiagnostic<Node, Data> & Supplemental

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

        add<Code extends DiagnosticCode>(
            code: Code,
            data: InternalDiagnosticInput<Code>
        ) {
            this.errors.add(code, data)
        }
    }
}
