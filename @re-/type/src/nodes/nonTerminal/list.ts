import { Base } from "../base/index.js"
import { ParserType } from "../parser.js"
import { Shift } from "../shift.js"
import { Bounds } from "./bounds.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace List {
    export namespace T {
        export type Parse<S extends ParserType.State> = ParserType.StateFrom<{
            L: ParserType.Modifier<S["L"], "[]">
            R: Shift.Operator<S["R"]["unscanned"]>
        }>

        export type ShiftToken<Unscanned extends string[]> =
            Unscanned extends Shift.Scan<infer Lookahead, infer Rest>
                ? Lookahead extends "]"
                    ? Shift.RightFrom<{
                          lookahead: "[]"
                          unscanned: Rest
                      }>
                    : Shift.Error<`Missing expected ']'.`>
                : Shift.Error<`Missing expected ']'.`>
    }

    export class ListNode extends NonTerminal implements Bounds.Boundable {
        toString() {
            return this.children.toString() + "[]"
        }

        allows(args: Base.Validation.Args) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args)
                return false
            }
            let allItemsAllowed = true
            let itemIndex = 0
            for (const itemValue of args.value) {
                const itemIsAllowed = this.children.allows({
                    ...args,
                    value: itemValue,
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, itemIndex)
                    }
                })
                if (!itemIsAllowed) {
                    allItemsAllowed = false
                }
                itemIndex++
            }
            return allItemsAllowed
        }

        generate() {
            return []
        }

        boundBy = "items"

        toBound(value: unknown[]) {
            return value.length
        }
    }
}
