import { Entry } from "@re-/tools"
import { Root } from "../root.js"
import { BaseNode, BaseNodeClass, ErrorsByPath } from "#node"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    export const Node: BaseNodeClass<
        Definition,
        object
    > = class extends BaseNode<Definition> {
        static matches = (def: object): def is Definition => Array.isArray(def)

        elements() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.Node.parse(elementDef, {
                    ...this.ctx,
                    path: this.ctx.path + `/${elementIndex}`,
                    shallowSeen: []
                })
            ]) as Entry<number, BaseNode<unknown>>[]
        }

        validate(value: unknown, errors: ErrorsByPath) {
            if (!Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            if (this.def.length !== value.length) {
                this.addUnassignable(value, errors)
                return
            }
            for (const [i, node] of this.elements()) {
                node.validate(value[i], errors)
            }
        }

        generate() {
            return this.elements().map(([, node]) => node.generate())
        }
    }
}
