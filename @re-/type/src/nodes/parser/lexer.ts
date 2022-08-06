import { Bound, List } from "../nonTerminal/index.js"
import {
    baseTerminatingChars,
    enclosedBaseStartChars,
    trivialSingleCharOperators
} from "./tokens.js"

export namespace Lexer {
    export class ValueScanner<Lookahead extends string = string> {
        private chars: string[]
        private i: number
        lookahead: Lookahead

        constructor(def: string) {
            this.chars = [...def, "END"]
            this.i = 0
            this.lookahead = "" as any
        }

        lookaheadIs<Token extends string>(
            token: Token
        ): this is ValueScanner<Token> {
            return this.lookahead === (token as string)
        }

        lookaheadIn<O>(o: O): this is ValueScanner<Extract<keyof O, string>> {
            return this.lookahead in o
        }

        shift() {
            // @ts-ignore
            this.lookahead += this.chars[this.i]
            this.i++
        }

        skip() {
            this.i++
        }

        get next() {
            return this.chars[this.i]
        }
    }

    export const shiftBase = (scanner: ValueScanner) => {
        scanner.lookahead = ""
        if (scanner.next === "(") {
            scanner.shift()
        } else if (scanner.next in enclosedBaseStartChars) {
            shiftEnclosedBase(scanner)
        } else if (scanner.next === " ") {
            scanner.skip()
            shiftBase(scanner)
        } else {
            shiftUnenclosedBase(scanner)
        }
    }

    const shiftUnenclosedBase = (scanner: ValueScanner) => {
        while (!(scanner.next in baseTerminatingChars)) {
            scanner.shift()
        }
    }

    const shiftEnclosedBase = (scanner: ValueScanner) => {
        do {
            scanner.shift()
            if (scanner.next === "END") {
                throw new Error(
                    `${scanner.lookahead} requires a closing ${scanner.lookahead[0]}.`
                )
            }
        } while (scanner.next !== scanner.lookahead[0])
        if (scanner.lookahead === "/") {
            throw new Error(`Regex literals cannot be empty.`)
        }
        scanner.shift()
    }

    export const shiftOperator = (scanner: ValueScanner) => {
        scanner.lookahead = ""
        scanner.shift()
        if (scanner.lookahead in trivialSingleCharOperators) {
            scanner
        } else if (scanner.lookaheadIs("[")) {
            List.shiftToken(scanner)
        } else if (scanner.lookaheadIn(Bound.startChars)) {
            Bound.shiftToken(scanner)
        } else if (scanner.lookahead === " ") {
            shiftOperator(scanner)
        } else {
            throw new Error(
                `Expected an operator (got '${scanner.lookahead}').`
            )
        }
    }
}
