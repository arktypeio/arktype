import { ElementOf, narrow } from "@re-/tools"
import { createTokenMatcher } from "../internal.js"

export * from "../internal.js"

export const expressionTokens = narrow(["|", "(", ")", ",", "[", "]", "=>"])

export const expressionTokenMatcher = createTokenMatcher(expressionTokens)

export type ExpressionTokens = typeof expressionTokens

export type ExpressionToken = ElementOf<ExpressionTokens>
