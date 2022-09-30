import type { NormalizedJsTypeName, NormalizedJsTypes } from "@re-/tools"
import { hasJsType, toString, uncapitalize } from "@re-/tools"
import type { TypeOptions } from "../../../scopes/type.js"
import type { Base } from "../../base.js"
import { pathToString } from "../../common.js"
import type { NarrowFn } from "./customValidator.js"
import type {
    DiagnosticCode,
    DiagnosticData,
    OptionsByDiagnostic
} from "./diagnostic.js"

export namespace Check {
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

    export const stringifyData = (data: unknown) =>
        toString(data, {
            maxNestedStringLength: 50
        })

    type BaseDiagnosticContext<Data = unknown> = {
        type: Pick<Base.node, "toString" | "toAst" | "toDefinition">
        data: {
            raw: Data
            toString(): string
        }
        message: string
    }

    type FullDiagnosticContext<
        Code extends DiagnosticCode,
        Data = unknown
    > = BaseDiagnosticContext<Data> & DiagnosticData<Code>

    export class State<Data = unknown> {
        path: string[] = []
        errors = new Diagnostics()
        checkedValuesByAlias: Record<string, object[]>

        constructor(public data: Data, public options: TypeOptions) {
            this.checkedValuesByAlias = {}
        }

        dataIsOfType<TypeName extends NormalizedJsTypeName>(
            typeName: TypeName
        ): this is State<NormalizedJsTypes[TypeName]> {
            return hasJsType(this.data, typeName)
        }

        add<Code extends DiagnosticCode>(
            code: Code,
            context: DiagnosticData<Code> & {
                type: Base.node
                message: string
            }
        ) {
            const fullContext = context as FullDiagnosticContext<Code>
            const raw = this.data
            fullContext.data = {
                raw,
                toString: () => stringifyData(raw)
            }
            fullContext.path = this.path
            const options = this.options.errors?.[code]
            if ("actual" in fullContext && !options?.omitActual) {
                fullContext.message += ` (was ${fullContext.actual})`
            }
            if (options?.message) {
                fullContext.message = options?.message(fullContext)
            }
            this.errors.push(new Diagnostic(code))
        }
    }
}
