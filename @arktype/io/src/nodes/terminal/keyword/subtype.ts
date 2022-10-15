import { Terminal } from "../terminal.js"
import { tsKeywords } from "./ts.js"

class EmailNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "email"
    readonly mustBe = "a valid email"
    expression = /^(.+)@(.+)\.(.+)$/
    allows(data: string) {
        return this.expression.test(data)
    }
    readonly precondition = tsKeywords.string
}

class AlphaonlyNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "alphaonly"
    readonly mustBe = "only letters"
    expression = /^[A-Za-z]+$/
    allows(data: string) {
        return this.expression.test(data)
    }
    readonly precondition = tsKeywords.string
}

class AlphanumericNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "alphanumeric"
    readonly mustBe = "only letters and digits"
    expression = /^[\dA-Za-z]+$/
    allows(data: string) {
        return this.expression.test(data)
    }
    readonly precondition = tsKeywords.string
}

class LowercaseNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "lowercase"
    readonly mustBe = "only lowercase letters"
    expression = /^[a-z]*$/
    allows(data: string) {
        return this.expression.test(data)
    }
    readonly precondition = tsKeywords.string
}

class UppercaseNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "uppercase"
    readonly mustBe = "only uppercase letters"
    expression = /^[A-Z]*$/
    allows(data: string) {
        return this.expression.test(data)
    }
    readonly precondition = tsKeywords.string
}

class IntegerNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "integer"
    readonly mustBe = "an integer"
    allows(data: number) {
        return Number.isInteger(data)
    }
    readonly precondition = tsKeywords.number
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
