import { Str } from "./str.js"
import { Base } from "#base"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    export class Node extends Base.Node<Definition> {
        left() {
            return Str.parse(this.def.slice(0, this.def.indexOf("&")), this.ctx)
        }
        right() {
            return Str.parse(
                this.def.slice(this.def.indexOf("&") + 1),
                this.ctx
            )
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            this.left().allows(value, errors)
            if (!errors[this.ctx.path]) {
                this.right().allows(value, errors)
            }
        }

        generate() {
            throw new Base.UngeneratableError(this.def, "intersection")
        }
    }
}
