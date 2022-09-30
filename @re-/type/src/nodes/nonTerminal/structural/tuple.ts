import type { Base } from "../../base.js"
import type { CheckState } from "../../traverse/check/check.js"
import type { Check, Generate } from "../../traverse/exports.js"
import { NonTerminal } from "../nonTerminal.js"
import { checkObjectKind } from "./common.js"

export type TupleDefinition = unknown[] | readonly unknown[]

export class TupleNode extends NonTerminal.Node {
    constructor(children: Base.node[]) {
        super(children)
    }

    toAst() {
        return this.children.map((child) => child.toAst())
    }

    toIsomorphicDef() {
        return this.children.map((child) => child.toIsomorphicDef())
    }

    toString() {
        if (!this.children.length) {
            return "[]"
        }
        let result = "["
        let i = 0
        for (i; i < this.children.length - 1; i++) {
            result += this.children[i].toString() + ", "
        }
        // Avoid trailing comma
        return result + this.children[i].toString() + "]"
    }

    check(state: Check.CheckState) {
        // TODO: Add "to" object with callables
        if (!checkObjectKind(this.toString(), "array", state)) {
            return
        }
        const expectedLength = this.children.length
        const actualLength = state.data.length
        if (expectedLength !== actualLength) {
            this.addTupleLengthError(state, expectedLength, actualLength)
            return
        }
        this.checkChildren(state)
    }

    private checkChildren(state: Check.CheckState) {
        const rootData: any = state.data
        for (let i = 0; i < this.children.length; i++) {
            state.path.push(i)
            state.data = rootData[i]
            this.children[i].check(state)
            state.path.pop()
        }
        state.data = rootData
    }

    generate(state: Generate.GenerateState) {
        return this.children.map((child, i) => {
            state.path.push(i)
            const result = child.generate(state)
            state.path.pop()
            return result
        })
    }

    private addTupleLengthError(
        state: CheckState<unknown[]>,
        expected: number,
        actual: number
    ) {
        state.errors.add(
            "tupleLength",
            {
                reason: `Length must be ${expected}`,
                state
            },
            {
                definition: this.toIsomorphicDef(),
                data: state.data,
                expected,
                actual
            }
        )
    }
}

export type TupleLengthDiagnostic = Check.DiagnosticConfig<{
    definition: TupleDefinition
    data: unknown[]
    expected: number
    actual: number
}>
