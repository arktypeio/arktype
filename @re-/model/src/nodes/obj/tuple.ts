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

        allows(args: Common.AllowsArgs) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args.value, args.errors)
                return
            }
            if (this.def.length !== args.value.length) {
                this.addUnassignableMessage(
                    lengthError(this.def, args.value),
                    args.errors
                )
                return
            }
            for (const [i, node] of this.next()) {
                node.allows({ ...args, value: args.value[i] })
            }
        }

        generate() {
            return this.next().map(([, node]) => node.generate())
        }
    }
}
