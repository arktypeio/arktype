import { strict } from "node:assert"
import { chainableNoOpProxy } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { SourcePosition } from "../common.js"
import { getAssertionAtPos } from "../type/getAssertionAtPos.js"
import { ChainableValueAssertion, createChainableAssertFn } from "./index.js"

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
    constructor(private ctx: AssertionContext) {}
}
