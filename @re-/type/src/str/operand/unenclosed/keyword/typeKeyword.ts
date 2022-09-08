import {
    boundableNode,
    boundsConstraint
} from "../../../operator/bound/bound.js"
import { regexConstraint } from "../../index.js"
import { Node, terminalNode } from "./common.js"

abstract class typeNode extends terminalNode {
    allows(args: Node.Allows.Args) {
        if (this.allowsValue(args.data)) {
            return true
        }
        args.diagnostics.push(
            new Node.Allows.UnassignableDiagnostic(this.toString(), args)
        )
        return false
    }

    abstract allowsValue(value: unknown): boolean
}

export class symbolNode extends typeNode {
    toString() {
        return "symbol"
    }

    allowsValue(value: unknown) {
        return typeof value === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}

export class functionNode extends typeNode {
    toString() {
        return "function"
    }

    allowsValue(value: unknown) {
        return typeof value === "function"
    }

    create(): Function {
        return Function()
    }
}

export class trueNode extends typeNode {
    toString() {
        return "true"
    }

    allowsValue(value: unknown) {
        return value === true
    }

    create(): true {
        return true
    }
}

export class falseNode extends typeNode {
    toString() {
        return "false"
    }

    allowsValue(value: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}

export class undefinedNode extends typeNode {
    toString() {
        return "undefined"
    }

    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): undefined {
        return undefined
    }
}

export class nullNode extends typeNode {
    toString() {
        return "null"
    }

    allowsValue(value: unknown) {
        return value === null
    }

    create(): null {
        return null
    }
}

export class anyNode extends typeNode {
    toString() {
        return "any"
    }

    allowsValue() {
        return true
    }

    create(): any {
        return undefined
    }
}

export class unknownNode extends typeNode {
    toString() {
        return "unknown"
    }
    allowsValue() {
        return true
    }

    create(): unknown {
        return undefined
    }
}

export class voidNode extends typeNode {
    toString() {
        return "void"
    }

    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): void {}
}

export class neverNode extends typeNode {
    toString() {
        return "never"
    }

    allowsValue() {
        return false
    }

    create(): never {
        throw new Node.Create.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}

export class objectNode extends typeNode {
    toString() {
        return "object"
    }

    allowsValue(value: unknown) {
        return typeof value === "object" && value !== null
    }

    create(): object {
        return {}
    }
}

export class booleanNode extends typeNode {
    toString() {
        return "boolean"
    }

    allowsValue(value: unknown) {
        return typeof value === "boolean"
    }

    create(): boolean {
        return false
    }
}

export class bigintNode extends typeNode {
    toString() {
        return "bigint"
    }

    allowsValue(value: unknown) {
        return typeof value === "bigint"
    }

    create(): bigint {
        return 0n
    }
}

export class numberNode extends typeNode implements boundableNode {
    bounds: boundsConstraint | undefined = undefined

    toString() {
        return "number"
    }

    allowsValue(value: unknown) {
        return typeof value === "number"
    }

    create(): string {
        return ""
    }
}

export class stringNode extends typeNode implements boundableNode {
    bounds: boundsConstraint | undefined = undefined

    constructor(private regex?: regexConstraint) {
        super()
    }

    toString() {
        return this.regex?.definition ?? "string"
    }

    allowsValue(data: unknown) {
        if (typeof data === "string") {
            this?.regex?.check(data)
            this?.bounds?.check()
        }
        return typeof data === "string"
    }

    create(): string {
        return ""
    }
}

export const typeKeywordsToNodes = {
    any: new anyNode(),
    bigint: new bigintNode(),
    boolean: new booleanNode(),
    false: new falseNode(),
    function: new functionNode(),
    never: new neverNode(),
    null: new nullNode(),
    object: new objectNode(),
    symbol: new symbolNode(),
    true: new trueNode(),
    undefined: new undefinedNode(),
    unknown: new unknownNode(),
    void: new voidNode()
}
