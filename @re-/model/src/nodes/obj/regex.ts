import { Common, Leaf } from "#common"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Leaf<Definition> {
        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (typeof value !== "string") {
                this.addUnassignableMessage(
                    `Non-string value ${Common.stringifyValue(
                        value
                    )} cannot satisfy regex definitions.`,
                    errors
                )
                return
            }
            if (!this.def.test(value)) {
                this.addUnassignableMessage(
                    `${Common.stringifyValue(
                        value
                    )} does not match expression /${this.def.source}/.`,
                    errors
                )
                return
            }
        }

        generate() {
            throw new Common.UngeneratableError(`/${this.def.source}/`, "Regex")
        }
    }
}
