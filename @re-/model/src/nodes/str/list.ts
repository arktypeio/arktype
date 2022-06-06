import { Str } from "./str.js"
import { Base } from "#base"

export namespace List {
    export type Definition<Child extends string = string> = `${Child}[]`

    export const matches = (def: string): def is Definition =>
        def.endsWith("[]")

    export class Node extends Base.Node<Definition> {
        item() {
            return Str.parse(this.def.slice(0, -2), this.ctx)
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            if (!Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            for (const [i, element] of Object.entries(value)) {
                const itemErrors = this.item().validateByPath(element)
                for (const [path, message] of Object.entries(itemErrors)) {
                    let itemPath = `${this.ctx.path}/${i}`
                    if (path !== this.ctx.path) {
                        itemPath += `/${path.slice(this.ctx.path.length)}`
                    }
                    errors[itemPath] = message
                }
            }
        }

        generate() {
            return []
        }
    }
}
