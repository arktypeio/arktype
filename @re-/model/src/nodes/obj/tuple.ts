import { Entry } from "@re-/tools"
import { Root } from "../root.js"
import { Base } from "#base"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    export class Node extends Base.Node<Definition> {
        elements() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.parse(elementDef, {
                    ...this.ctx,
                    path: `${this.ctx.path}${
                        this.ctx.path ? "/" : ""
                    }${elementIndex}`,
                    shallowSeen: []
                })
            ]) as Entry<number, Base.Node<unknown>>[]
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            if (!Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            if (this.def.length !== value.length) {
                this.addUnassignable(value, errors)
                return
            }
            for (const [i, node] of this.elements()) {
                node.allows(value[i], errors)
            }
        }

        generate() {
            return this.elements().map(([, node]) => node.generate())
        }
    }
}
