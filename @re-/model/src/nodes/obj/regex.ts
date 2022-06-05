import { UngeneratableError } from "#errors"
import { BaseNode, BaseNodeClass } from "#node"

export namespace Regex {
    export type Definition = RegExp

    export const Node: BaseNodeClass<
        Definition,
        object
    > = class extends BaseNode<Definition> {
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
