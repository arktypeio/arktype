import { Str } from "./str.js"
import { Branch, Common } from "#common"

export namespace List {
    export type Definition<Child extends string = string> = `${Child}[]`

    export const matches = (def: string): def is Definition =>
        def.endsWith("[]")

    export class Node extends Branch<Definition> {
        parse() {
            return Str.parse(this.def.slice(0, -2), this.ctx)
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (!Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            for (const [i, element] of Object.entries(value)) {
                const itemErrors = this.next().validateByPath(element)
                for (const [path, message] of Object.entries(itemErrors)) {
                    let itemPath = `${this.ctx.path}${
                        this.ctx.path ? "/" : ""
                    }${i}`
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
