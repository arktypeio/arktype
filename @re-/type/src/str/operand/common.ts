export * from "../common.js"
export * from "../parser/index.js"

import { Node } from "../common.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class terminalNode<
    defType extends string = string
> extends Node.base {
    constructor(public def: defType) {
        super()
    }

    get tree() {
        return this.def
    }

    toString() {
        return this.def
    }

    collectReferences(
        args: Node.References.Options,
        collected: Node.References.Collection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }
}

export abstract class primitiveLiteralNode<
    Def extends string,
    Value extends PrimitiveLiteralValue
> extends terminalNode {
    constructor(public def: Def, public value: Value) {
        super(def)
    }

    allows(args: Node.Allows.Args) {
        if (args.value === this.value) {
            return true
        }
        args.diagnostics.push(
            new Node.Allows.UnassignableDiagnostic(args, this)
        )
        return false
    }

    create() {
        return this.value
    }
}

export const expressionExpectedMessage = <Unscanned extends string>(
    unscanned: Unscanned
) =>
    `Expected an expression${
        unscanned ? ` (got '${unscanned}')` : ""
    }.` as ExpressionExpectedMessage<Unscanned>

export type ExpressionExpectedMessage<Unscanned extends string> =
    `Expected an expression${Unscanned extends ""
        ? ""
        : ` (got '${Unscanned}')`}.`
