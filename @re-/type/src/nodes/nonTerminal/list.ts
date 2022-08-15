import { Base } from "../base/index.js"
import { Scan, State } from "../parser/index.js"
import { Lexer } from "../parser/lexer.js"
import { BoundableNode } from "./bound/index.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace List {
    export const parse = (s: State.Value, ctx: Base.Parsing.Context) => {
        s.root = new ListNode(s.root!, ctx)
        Lexer.shiftOperator(s.scanner)
    }

    export type Parse<S extends State.Expression> = S["R"] extends Scan<
        "]",
        infer Remaining
    >
        ? State.ExpressionFrom<
              State.SetTreeRoot<S["L"], [S["L"]["root"], "[]"]>,
              Remaining
          >
        : State.Throw<S, `Missing expected ']'.`>

    export const shiftToken = (scanner: Lexer.ValueScanner<"[">) => {
        if (scanner.next !== "]") {
            throw new Error(`Missing expected ].`)
        }
        scanner.shift()
    }

    export type Node<Child> = [Child, "[]"]
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
