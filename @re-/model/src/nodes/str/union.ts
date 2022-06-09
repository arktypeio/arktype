import { Str } from "./str.js"
import { Base } from "#base"

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    export class Node extends Base.NonTerminal<Definition> {
        #left?: Base.Node<unknown>
        get left() {
            if (!this.#left) {
                this.#left = Str.parse(
                    this.def.slice(0, this.def.indexOf("|")),
                    this.ctx
                )
            }
            return this.#left
        }

        #right?: Base.Node<unknown>
        get right() {
            if (!this.#right) {
                this.#right = Str.parse(
                    this.def.slice(this.def.indexOf("|") + 1),
                    this.ctx
                )
            }
            return this.#right
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            this.left.allows(value, errors)
            const leftErrors = errors[this.ctx.path]
            if (leftErrors) {
                delete errors[this.ctx.path]
                this.right.allows(value, errors)
                const rightErrors = errors[this.ctx.path]
                if (rightErrors) {
                    this.addUnassignableMessage(
                        `${Base.stringifyValue(
                            value
                        )} is not assignable to any of ${this.stringifyDef()}.`,
                        errors
                    )
                }
            }
        }

        generate() {
            return this.left.generate()
        }
    }
}
