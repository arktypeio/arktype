import { Base } from "#base"
import { UngeneratableError } from "#errors"

export namespace Regex {
    export type Definition = RegExp

    export class Node extends Base.Node<Definition> {
        static matches(def: object): def is Definition {
            return def instanceof RegExp
        }

        validate(value: unknown) {
            return typeof value === "string" && this.def.test(value)
        }

        generate() {
            throw new UngeneratableError(`/${this.def.source}/`, "Regex")
        }
    }
}
