import { Base } from "../base/index.js"
import { Lexer } from "../parser/lexer.js"
import { ParserState } from "../parser/state.js"
import { Boundable } from "./bound.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace List {
    export type Parse<S extends ParserState.Type> = ParserState.From<{
        L: ParserState.Modify<S["L"], "[]">
        R: Lexer.ShiftOperator<S["R"]["unscanned"]>
    }>

    export const parse = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        s.root = new ListNode(s.root!, ctx)
        Lexer.shiftOperator(s.scanner)
    }

    export type Node<Child = unknown> = [Child, "[]"]

    export type ShiftToken<Unscanned extends string[]> =
        Unscanned extends Lexer.Scan<infer Lookahead, infer Rest>
            ? Lookahead extends "]"
                ? ParserState.RightFrom<{
                      lookahead: "[]"
                      unscanned: Rest
                  }>
                : Lexer.ShiftError<`Missing expected ']'.`>
            : Lexer.ShiftError<`Missing expected ']'.`>

    export const shiftToken = (scanner: Lexer.Scanner<"[">) => {
        if (scanner.next !== "]") {
            throw new Error(`Missing expected ].`)
        }
        scanner.shift()
    }
}

export class ListNode extends NonTerminal implements Boundable {
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
