import { Root } from "../root.js"
import { BaseNode, BaseNodeClass } from "#node"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    export const Node: BaseNodeClass<
        Definition,
        object
    > = class extends BaseNode<Definition> {
        static matches = (def: object): def is Definition => Array.isArray(def)

        next() {
            return this.def.map((elementDef, elementIndex) =>
                Root.Node.parse(elementDef, {
                    ...this.ctx,
                    path: [...this.ctx.path, `${elementIndex}`],
                    shallowSeen: []
                })
            )
        }

        validate(value: unknown) {
            if (!Array.isArray(value)) {
                return false
            }
            if (this.def.length !== value.length) {
                return false
            }
            return this.next().every((node, i) => node.validate(value[i]))
        }

        generate() {
            return this.next().map((node) => node.generate())
        }
    }
}
