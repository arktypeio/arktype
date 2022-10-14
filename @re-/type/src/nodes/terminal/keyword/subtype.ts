import { Terminal } from "../terminal.js"
import { tsKeywords } from "./ts.js"

class EmailNode extends Terminal.Node {
    kind = "keyword"
    definition = "email"
    mustBe = "a valid email"
    expression = /^(.+)@(.+)\.(.+)$/
    allows(data: string) {
        return this.expression.test(data)
    }
    precondition = tsKeywords.string
}

class AlphaonlyNode extends Terminal.Node {
    kind = "keyword"
    definition = "alphaonly"
    mustBe = "only letters"
    expression = /^[A-Za-z]+$/
    allows(data: string) {
        return this.expression.test(data)
    }
    precondition = tsKeywords.string
}

class AlphanumericNode extends Terminal.Node {
    kind = "keyword"
    definition = "alphanumeric"
    mustBe = "only letters and digits"
    expression = /^[\dA-Za-z]+$/
    allows(data: string) {
        return this.expression.test(data)
    }
    precondition = tsKeywords.string
}

class LowercaseNode extends Terminal.Node {
    kind = "keyword"
    definition = "lowercase"
    mustBe = "only lowercase letters"
    expression = /^[a-z]*$/
    allows(data: string) {
        return this.expression.test(data)
    }
    precondition = tsKeywords.string
}

class UppercaseNode extends Terminal.Node {
    kind = "keyword"
    definition = "uppercase"
    mustBe = "only uppercase letters"
    expression = /^[A-Z]*$/
    allows(data: string) {
        return this.expression.test(data)
    }
    precondition = tsKeywords.string
}

class IntegerNode extends Terminal.Node {
    kind = "keyword"
    definition = "integer"
    mustBe = "an integer"
    allows(data: number) {
        return Number.isInteger(data)
    }
    precondition = tsKeywords.number
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
