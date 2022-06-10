import { Entry } from "@re-/tools"
import { Root } from "../root.js"
import { Branch, Common } from "#common"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    const lengthError = (def: Definition, value: Definition) =>
        `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    type ParseResult = Entry<number, Common.Node>[]

    export class Node extends Branch<Definition, ParseResult> {
        parse() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.parse(elementDef, {
                    ...this.ctx,
                    path: this.appendToPath(elementIndex),
                    shallowSeen: []
                })
            ]) as ParseResult
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (!Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            if (this.def.length !== value.length) {
                this.addUnassignableMessage(
                    lengthError(this.def, value),
                    errors
                )
                return
            }
            for (const [i, node] of this.next()) {
                node.allows(value[i], errors)
            }
        }

        generate() {
            return this.next().map(([, node]) => node.generate())
        }
    }
}
