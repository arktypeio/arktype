import { Base } from "../base/base.js"
import type { Alias } from "./alias.js"
import type { Keyword } from "./keyword/keyword.js"
import type { Literal } from "./literal/literal.js"

export namespace Terminal {
    export abstract class Node extends Base.Node {
        readonly definitionRequiresStructure = false

        children: undefined
        abstract readonly definition: string
        abstract kind: KindName

        get mustBe() {
            return this.description as this["description"]
        }

        toString() {
            return this.definition as this["definition"]
        }

        get ast() {
            return this.definition as this["definition"]
        }
    }

    export type Kinds = Keyword.Kinds & Literal.Kinds & { alias: Alias.Node }

    export type KindName = keyof Kinds
}
