import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"
import { typeKeywords } from "./type.js"

abstract class RegexKeywordNode extends Terminal.Node {
    readonly kind = "regexKeyword"

    traverse(traversal: Base.Traversal): traversal is Base.Traversal<string> {
        if (!typeKeywords.string.traverse(traversal)) {
            return false
        }
        if (!this.expression.test(traversal.data)) {
            traversal.addProblem(this)
            return false
        }
        return true
    }

    abstract readonly expression: RegExp
}

class EmailNode extends RegexKeywordNode {
    readonly definition = "email"
    readonly description = "a valid email"
    expression = /^(.+)@(.+)\.(.+)$/
}

class AlphaonlyNode extends RegexKeywordNode {
    readonly definition = "alphaonly"
    readonly description = "only letters"
    expression = /^[A-Za-z]+$/
}

class AlphanumericNode extends RegexKeywordNode {
    readonly definition = "alphanumeric"
    readonly description = "only letters and digits"
    expression = /^[\dA-Za-z]+$/
}

class LowercaseNode extends RegexKeywordNode {
    readonly definition = "lowercase"
    readonly description = "only lowercase letters"
    expression = /^[a-z]*$/
}

class UppercaseNode extends RegexKeywordNode {
    readonly definition = "uppercase"
    readonly description = "only uppercase letters"
    expression = /^[A-Z]*$/
}

class IntegerNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "integer"
    readonly description = "an integer"

    traverse(traversal: Base.Traversal): traversal is Base.Traversal<number> {
        if (!typeKeywords.number.traverse(traversal)) {
            return false
        }
        if (!Number.isInteger(traversal.data)) {
            traversal.addProblem(this)
            return false
        }
        return true
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
