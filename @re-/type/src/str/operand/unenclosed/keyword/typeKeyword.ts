import { Node, terminalNode } from "./common.js"

abstract class BaseTypeKeyword extends terminalNode {
    allows(args: Node.Allows.Args) {
        if (this.allowsValue(args.value)) {
            return true
        }
        this.unassignableError(args)
        return false
    }

    abstract allowsValue(value: unknown): boolean
}

class SymbolKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}

class FunctionKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "function"
    }

    create(): Function {
        return Function()
    }
}

class TrueKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === true
    }

    create(): true {
        return true
    }
}

class FalseKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}

class UndefinedKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): undefined {
        return undefined
    }
}

class NullKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === null
    }

    create(): null {
        return null
    }
}

class AnyKeyword extends BaseTypeKeyword {
    allowsValue() {
        return true
    }

    create(): any {
        return undefined
    }
}

class UnknownKeyword extends BaseTypeKeyword {
    allowsValue() {
        return true
    }

    create(): unknown {
        return undefined
    }
}

class VoidKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): void {
        return undefined
    }
}

class NeverKeyword extends BaseTypeKeyword {
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

class ObjectKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "object" && value !== null
    }

    create(): object {
        return {}
    }
}

class BooleanKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "boolean"
    }

    create(): boolean {
        return false
    }
}

class BigintKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "bigint"
    }

    create(): bigint {
        return 0n
    }
}

export const typeKeywordsToNodes = {
    any: AnyKeyword,
    bigint: BigintKeyword,
    boolean: BooleanKeyword,
    false: FalseKeyword,
    function: FunctionKeyword,
    never: NeverKeyword,
    null: NullKeyword,
    object: ObjectKeyword,
    symbol: SymbolKeyword,
    true: TrueKeyword,
    undefined: UndefinedKeyword,
    unknown: UnknownKeyword,
    void: VoidKeyword
}
