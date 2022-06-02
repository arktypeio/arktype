import { NumericString } from "@re-/tools"

export namespace EmbeddedNumberLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>
}
