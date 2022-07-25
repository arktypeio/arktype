import { Base } from "../base.js"

abstract class BaseTypeKeyword extends Base.Terminal<string> {
    allows(args: Base.Validation.Args) {
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

    generate(): symbol {
        return Symbol()
    }
}

export class FunctionKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "function"
    }

    generate(): Function {
        return Function()
    }
}

export class TrueKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === true
    }

    generate(): true {
        return true
    }
}

export class FalseKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === false
    }

    generate(): false {
        return false
    }
}

export class UndefinedKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === undefined
    }

    generate(): undefined {
        return undefined
    }
}

export class NullKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === null
    }

    generate(): null {
        return null
    }
}

export class AnyKeyword extends BaseTypeKeyword {
    allowsValue() {
        return true
    }

    generate(): any {
        return undefined
    }
}

export class UnknownKeyword extends BaseTypeKeyword {
    allowsValue() {
        return true
    }

    generate(): unknown {
        return undefined
    }
}

export class VoidKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return value === undefined
    }

    generate(): void {
        return undefined
    }
}

export class NeverKeyword extends BaseTypeKeyword {
    allowsValue() {
        return false
    }

    generate(): never {
        throw new Base.Create.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}

export class ObjectKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "object" && value !== null
    }

    generate(): object {
        return {}
    }
}

export class BooleanKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "boolean"
    }

    generate(): boolean {
        return false
    }
}

export class BigintKeyword extends BaseTypeKeyword {
    allowsValue(value: unknown) {
        return typeof value === "bigint"
    }

    generate(): bigint {
        return 0n
    }
}
