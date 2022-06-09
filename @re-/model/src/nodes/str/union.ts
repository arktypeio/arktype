import { Str } from "./str.js"
import { Base } from "#base"

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    export class Node extends Base.Branching<Definition> {
        *parse() {
            yield Str.parse(this.def.slice(0, this.def.indexOf("|")), this.ctx)
            return Str.parse(
                this.def.slice(this.def.indexOf("|") + 1),
                this.ctx
            )
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            this.branch(0).allows(value, errors)
            const leftErrors = errors[this.ctx.path]
            if (leftErrors) {
                delete errors[this.ctx.path]
                this.branch(1).allows(value, errors)
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
            return this.branch(0).generate()
        }
    }
}
