import { Allows } from "../../../traversal/allows.js"
import { Create } from "../../../traversal/create.js"
import { terminalNode } from "../terminal.js"

/**
 *  pureNodes are simple, context-free terminalNodes that represent a single type.
 *  In the interest of performance, all pureNode subclasses are instantiated as singletons,
 *  so it is critical that each of their methods (check, create etc.) behave deterministically
 *  without regard to their location in the parse tree and free from constraints that apply to
 *  a particular instance of an impure node (e.g. number or string, which can have bounds).
 */
export abstract class pureNode extends terminalNode {
    private static instances: {
        [Keyword in PureKeyword]?: pureNode
    } = {}

    constructor(private keyword: PureKeyword) {
        const cachedInstance = pureNode.instances[keyword]
        if (cachedInstance) {
            return cachedInstance
        }
        super()
        pureNode.instances[keyword] = this
    }

    toString() {
        return this.keyword
    }

    check(args: Allows.Args) {
        if (this.allows(args.data)) {
            return true
        }
        args.diagnostics.push(
            new Allows.UnassignableDiagnostic(this.keyword, args)
        )
        return false
    }

    abstract allows(data: unknown): boolean
}

export class anyNode extends pureNode {
    constructor() {
        super("any")
    }

    allows() {
        return true
    }

    create(): any {
        return undefined
    }
}

export class bigintNode extends pureNode {
    constructor() {
        super("bigint")
    }

    allows(data: unknown) {
        return typeof data === "bigint"
    }

    create(): bigint {
        return 0n
    }
}

export class booleanNode extends pureNode {
    constructor() {
        super("boolean")
    }

    allows(data: unknown) {
        return typeof data === "boolean"
    }

    create(): boolean {
        return false
    }
}

export class functionNode extends pureNode {
    constructor() {
        super("function")
    }

    allows(data: unknown) {
        return typeof data === "function"
    }

    create(): Function {
        return Function()
    }
}

export class neverNode extends pureNode {
    constructor() {
        super("never")
    }

    allows() {
        return false
    }

    create(): never {
        throw new Create.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}

export class nullNode extends pureNode {
    constructor() {
        super("null")
    }

    allows(data: unknown) {
        return data === null
    }

    create(): null {
        return null
    }
}

export class objectNode extends pureNode {
    constructor() {
        super("object")
    }

    allows(data: unknown) {
        return typeof data === "object" && data !== null
    }

    create(): object {
        return {}
    }
}

export class symbolNode extends pureNode {
    constructor() {
        super("symbol")
    }

    allows(data: unknown) {
        return typeof data === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}

export class undefinedNode extends pureNode {
    constructor() {
        super("undefined")
    }

    allows(data: unknown) {
        return data === undefined
    }

    create(): undefined {
        return undefined
    }
}

export class unknownNode extends pureNode {
    constructor() {
        super("unknown")
    }

    allows() {
        return true
    }

    create(): unknown {
        return undefined
    }
}

export class voidNode extends pureNode {
    constructor() {
        super("void")
    }

    allows(data: unknown) {
        return data === undefined
    }

    create(): void {}
}

export const pureKeywords = {
    any: anyNode,
    bigint: bigintNode,
    boolean: booleanNode,
    function: functionNode,
    never: neverNode,
    null: nullNode,
    object: objectNode,
    symbol: symbolNode,
    undefined: undefinedNode,
    unknown: unknownNode,
    void: voidNode
}

export type PureKeyword = keyof typeof pureKeywords
