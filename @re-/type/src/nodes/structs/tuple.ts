import type { Evaluate } from "@re-/tools"
import type { RootNode } from "../common.js"
import type { CheckState } from "../traverse/check/check.js"
import type { Check, Generate } from "../traverse/exports.js"
import { checkObjectRoot, struct } from "./struct.js"

export type TupleDefinition = unknown[] | readonly unknown[]

export type InferTuple<Ast extends readonly unknown[], Space> = Evaluate<{
    [I in keyof Ast]: RootNode.Infer<Ast[I], Space>
}>

export class TupleNode extends struct<number> {
    check(state: Check.CheckState) {
        if (!checkObjectRoot(this.definition, "array", state)) {
            return
        }
        const expectedLength = this.entries.length
        const actualLength = state.data.length
        if (expectedLength !== actualLength) {
            this.addTupleLengthError(state, expectedLength, actualLength)
            return
        }
        this.checkChildren(state)
    }

    private checkChildren(state: Check.CheckState) {
        const rootData: any = state.data
        for (const [k, child] of this.entries) {
            state.path.push(k)
            state.data = rootData[k]
            child.check(state)
            state.path.pop()
        }
        state.data = rootData
    }

    generate(state: Generate.GenerateState) {
        return this.entries.map(([i, child]) => {
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
                state: state
            },
            {
                definition: this.definition,
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
