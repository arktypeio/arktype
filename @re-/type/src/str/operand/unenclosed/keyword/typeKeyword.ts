import { Node } from "./common.js"

abstract class BaseTypeKeyword extends Node.terminalNode {
    allows(args: Node.Allows.Args) {
        if (this.allowsValue(args.value)) {
            return true
        }
        this.addUnassignable(args)
        return false
    }

    abstract allowsValue(value: unknown): boolean
}

export class SymbolKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}

export class FunctionKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "function"
    }

    create(): Function {
        return Function()
    }
}

export class TrueKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === true
    }

    create(): true {
        return true
    }
}

export class FalseKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}

export class UndefinedKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): undefined {
        return undefined
    }
}

export class NullKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === null
    }

    create(): null {
        return null
    }
}

export class AnyKeyword extends BaseTypeKeyword {
    allowsValue() {
        return true
    }

    create(): any {
        return undefined
    }
}

export class UnknownKeyword extends BaseTypeKeyword {
    allowsValue() {
        return true
    }

    create(): unknown {
        return undefined
    }
}

export class VoidKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): void {
        return undefined
    }
}

export class NeverKeyword extends BaseTypeKeyword {
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
    allowsValue(value: unknown) {
        return typeof value === "object" && value !== null
    }

    create(): object {
        return {}
    }
}

export class BooleanKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "boolean"
    }

    create(): boolean {
        return false
    }
}

export class BigintKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "bigint"
    }

    create(): bigint {
        return 0n
    }
}
