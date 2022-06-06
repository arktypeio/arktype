import { Base } from "#base"
import { UngeneratableError } from "#errors"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Base.Node<Definition> {
        validate(value: unknown) {
            return typeof value === "string" && this.def.test(value)
        }

        generate() {
            throw new UngeneratableError(`/${this.def.source}/`, "Regex")
        }
    }
}
