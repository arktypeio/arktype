import { Base } from "#base"
import { UngeneratableError } from "#errors"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Base.Node<Definition> {
        validate(value: unknown, errors: Base.ErrorsByPath) {
            if (typeof value !== "string") {
                this.addUnassignableMessage(
                    `Non-string value ${Base.stringifyValue(
                        value
                    )} cannot satisfy regex definitions.`,
                    errors
                )
                return
            }
            if (!this.def.test(value)) {
                this.addUnassignableMessage(
                    `${Base.stringifyValue(value)} does not match expression /${
                        this.def.source
                    }/.`,
                    errors
                )
                return
            }
        }

        generate() {
            throw new UngeneratableError(`/${this.def.source}/`, "Regex")
        }
    }
}
