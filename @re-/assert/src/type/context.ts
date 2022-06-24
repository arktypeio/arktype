import { strict } from "node:assert"
import { chainableNoOpProxy } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { SourcePosition } from "../common.js"
import { chainableAssertion, ChainableValueAssertion } from "../value/index.js"
import { getAssertionData } from "./analysis.js"

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = ChainableValueAssertion<[expected: Expected], false, Chained, false>

export type TypeAssertionProps = {
    toString: ValueFromTypeAssertion<string>
    errors: ValueFromTypeAssertion<string | RegExp, string>
}

export type AssertTypeContext = (
    position: SourcePosition,
    config: AssertionContext
) => TypeAssertionProps

export class TypeAssertions {
    constructor(
        private position: SourcePosition,
        private ctx: AssertionContext
    ) {}

    get type(): TypeAssertionProps {
        if (this.ctx.config.skipTypes) {
            return chainableNoOpProxy
        }
        return {
            toString: chainableAssertion(
                this.position,
                () => getAssertionData(this.position).type.actual,
                { ...this.ctx, allowTypeAssertions: false }
            ),
            errors: chainableAssertion(
                this.position,
                () => getAssertionData(this.position).errors,
                { ...this.ctx, allowTypeAssertions: false },
                { allowRegex: true }
            )
        } as TypeAssertionProps
    }

    get typed(): unknown {
        if (this.ctx.config.skipTypes) {
            return chainableNoOpProxy
        }
        const assertionData = getAssertionData(this.position)
        if (!assertionData.type.expected) {
            throw new Error(
                `Expected an 'as' expression after 'typed' prop access at position ${this.position.char} on ` +
                    `line ${this.position.line} of ${this.position.file}.`
            )
        }
        if (
            !assertionData.type.equivalent &&
            assertionData.type.actual !== assertionData.type.expected
        ) {
            strict.equal(assertionData.type.actual, assertionData.type.expected)
        }
        return undefined
    }
}
