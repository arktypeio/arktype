import { Base } from "../base/base.js"

export namespace Terminal {
    export abstract class Node extends Base.Node implements Base.ProblemSource {
        definitionRequiresStructure = false

        children: undefined
        abstract readonly definition: string

        get mustBe() {
            return this.description
        }

        toString() {
            return this.definition as this["definition"]
        }

        get ast() {
            return this.definition as this["definition"]
        }
    }
}
