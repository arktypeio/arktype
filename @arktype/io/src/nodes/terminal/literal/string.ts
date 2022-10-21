import { PrimitiveLiteral } from "./literal.js"

export namespace StringLiteral {
    export type Definition<Text extends string = string> =
        | DoubleQuoted<Text>
        | SingleQuoted<Text>

    export type DoubleQuoted<Text extends string = string> = `"${Text}"`

    export type SingleQuoted<Text extends string = string> = `'${Text}'`

    export type Quote = "'" | '"'

    export class DoubleQuotedNode extends PrimitiveLiteral.Node {
        readonly kind = "doubleQuotedStringLiteral"
        public value: string
        constructor(public definition: DoubleQuoted) {
            super()
            this.value = definition.slice(1, -1)
        }
    }

    export class SingleQuotedNode extends PrimitiveLiteral.Node {
        readonly kind = "singleQuotedStringLiteral"
        public value: string
        constructor(public definition: SingleQuoted) {
            super()
            this.value = definition.slice(1, -1)
        }
    }
}
