import { Node, terminalNode } from "./common.js"

abstract class BaseTypeKeyword extends terminalNode {
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

export class SymbolKeyword extends BaseTypeKeyword {
    constructor() {
        super("symbol")
    }

    allowsValue(value: unknown) {
        return typeof value === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}

export class FunctionKeyword extends BaseTypeKeyword {
    constructor() {
        super("function")
    }

    allowsValue(value: unknown) {
        return typeof value === "function"
    }

    create(): Function {
        return Function()
    }
}

export class TrueKeyword extends BaseTypeKeyword {
    constructor() {
        super("true")
    }

    allowsValue(value: unknown) {
        return value === true
    }

    create(): true {
        return true
    }
}

export class FalseKeyword extends BaseTypeKeyword {
    constructor() {
        super("false")
    }

    allowsValue(value: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}

export class UndefinedKeyword extends BaseTypeKeyword {
    constructor() {
        super("undefined")
    }

    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): undefined {
        return undefined
    }
}

export class NullKeyword extends BaseTypeKeyword {
    constructor() {
        super("null")
    }

    allowsValue(value: unknown) {
        return value === null
    }

    create(): null {
        return null
    }
}

export class AnyKeyword extends BaseTypeKeyword {
    constructor() {
        super("any")
    }

    allowsValue() {
        return true
    }

    create(): any {
        return undefined
    }
}

export class UnknownKeyword extends BaseTypeKeyword {
    constructor() {
        super("unknown")
    }

    allowsValue() {
        return true
    }

    create(): unknown {
        return undefined
    }
}

export class VoidKeyword extends BaseTypeKeyword {
    constructor() {
        super("void")
    }

    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): void {
        return undefined
    }
}

export class NeverKeyword extends BaseTypeKeyword {
    constructor() {
        super("never")
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

export class ObjectKeyword extends BaseTypeKeyword {
    constructor() {
        super("object")
    }

    allowsValue(value: unknown) {
        return typeof value === "object" && value !== null
    }

    create(): object {
        return {}
    }
}

export class BooleanKeyword extends BaseTypeKeyword {
    constructor() {
        super("boolean")
    }

    allowsValue(value: unknown) {
        return typeof value === "boolean"
    }

    create(): boolean {
        return false
    }
}

export class BigintKeyword extends BaseTypeKeyword {
    constructor() {
        super("bigint")
    }

    allowsValue(value: unknown) {
        return typeof value === "bigint"
    }

    create(): bigint {
        return 0n
    }
}

export const typeKeywordsToNodes = {
    any: new AnyKeyword(),
    bigint: new BigintKeyword(),
    boolean: new BooleanKeyword(),
    false: new FalseKeyword(),
    function: new FunctionKeyword(),
    never: new NeverKeyword(),
    null: new NullKeyword(),
    object: new ObjectKeyword(),
    symbol: new SymbolKeyword(),
    true: new TrueKeyword(),
    undefined: new UndefinedKeyword(),
    unknown: new UnknownKeyword(),
    void: new VoidKeyword()
}
