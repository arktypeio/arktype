import { Base } from "../base/index.js"
import { Expression } from "../parser/expression.js"
import { Lexer } from "../parser/lexer.js"
import { BoundableNode } from "./bound/index.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace List {
    export type Parse<S extends Expression.State.Type> =
        Expression.ShiftOperator<S, [S["root"], "[]"]>

    export const parse = (
        s: Expression.State.Value,
        ctx: Base.Parsing.Context
    ) => {
        s.root = new ListNode(s.root!, ctx)
        Lexer.shiftOperator(s.scanner)
    }

    export type Node<Child = unknown> = [Child, "[]"]

    export type ShiftToken<Unscanned extends string[]> =
        Unscanned extends Lexer.Scan<infer Lookahead, infer Rest>
            ? Lookahead extends "]"
                ? Lexer.ScannerFrom<{
                      lookahead: "[]"
                      unscanned: Rest
                  }>
                : Lexer.ShiftError<Unscanned, `Missing expected ']'.`>
            : Lexer.ShiftError<[], `Missing expected ']'.`>

    export const shiftToken = (scanner: Lexer.ValueScanner<"[">) => {
        if (scanner.next !== "]") {
            throw new Error(`Missing expected ].`)
        }
        scanner.shift()
    }
}

export class ListNode extends NonTerminal implements BoundableNode {
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
