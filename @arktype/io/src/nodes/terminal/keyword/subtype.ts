import type { TraversalState } from "../../traversal/traversal.js"
import { Terminal } from "../terminal.js"
import { typeKeywords } from "./type.js"

abstract class RegexKeywordNode extends Terminal.Node {
    readonly kind = "regexKeyword"

    traverse(state: TraversalState): state is TraversalState<string> {
        return (
            typeKeywords.string.traverse(state) &&
            (this.expression.test(state.data) || state.problems.add(this))
        )
    }

    abstract readonly expression: RegExp
}

class EmailNode extends RegexKeywordNode {
    readonly definition = "email"
    readonly mustBe = "a valid email"
    expression = /^(.+)@(.+)\.(.+)$/
}

class AlphaonlyNode extends RegexKeywordNode {
    readonly definition = "alphaonly"
    readonly mustBe = "only letters"
    expression = /^[A-Za-z]+$/
}

class AlphanumericNode extends RegexKeywordNode {
    readonly definition = "alphanumeric"
    readonly mustBe = "only letters and digits"
    expression = /^[\dA-Za-z]+$/
}

class LowercaseNode extends RegexKeywordNode {
    readonly definition = "lowercase"
    readonly mustBe = "only lowercase letters"
    expression = /^[a-z]*$/
}

class UppercaseNode extends RegexKeywordNode {
    readonly definition = "uppercase"
    readonly mustBe = "only uppercase letters"
    expression = /^[A-Z]*$/
}

class IntegerNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "integer"
    readonly mustBe = "an integer"
    traverse(state: TraversalState): state is TraversalState<number> {
        return typeKeywords.number.traverse(state) &&
            Number.isInteger(state.data)
            ? true
            : state.problems.add(this)
    }
}

export const stringSubtypeKeywords = {
    email: new EmailNode(),
    alphaonly: new AlphaonlyNode(),
    alphanumeric: new AlphanumericNode(),
    lowercase: new LowercaseNode(),
    uppercase: new UppercaseNode()
}

export const numberSubtypeKeywords = {
    integer: new IntegerNode()
}
