import { Base } from "../base.js"

const BaseTypeKeyword = Base.Leaf<string>

export class SymbolKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return typeof args.value === "symbol"
    }

    generate(): symbol {
        return Symbol()
    }
}

export class FunctionKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return typeof args.value === "function"
    }

    generate(): Function {
        return Function()
    }
}

export class TrueKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return args.value === true
    }

    generate(): true {
        return true
    }
}

export class FalseKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return args.value === false
    }

    generate(): false {
        return false
    }
}

export class UndefinedKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return args.value === undefined
    }

    generate(): undefined {
        return undefined
    }
}

export class NullKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return args.value === null
    }

    generate(): null {
        return null
    }
}

export class AnyKeyword extends BaseTypeKeyword {
    allows() {
        return true
    }

    generate(): any {
        return undefined
    }
}

export class UnknownKeyword extends BaseTypeKeyword {
    allows() {
        return true
    }

    generate(): unknown {
        return undefined
    }
}

export class VoidKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return args.value === undefined
    }

    generate(): void {
        return undefined
    }
}

export class NeverKeyword extends BaseTypeKeyword {
    allows() {
        return false
    }

    generate(): never {
        throw new Base.Generation.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}

export class ObjectKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return typeof args.value === "object" && args.value !== null
    }

    generate(): object {
        return {}
    }
}

export class BooleanKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return typeof args.value === "boolean"
    }

    generate(): boolean {
        return false
    }
}

export class BigintKeyword extends BaseTypeKeyword {
    allows(args: Base.Validation.Args) {
        return typeof args.value === "bigint"
    }

    generate(): bigint {
        return 0n
    }
}
