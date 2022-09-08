export * from "../common.js"
export * from "../parser/index.js"

import { Node } from "../common.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class terminalNode extends Node.base {
    get tree() {
        return this.toString()
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
    Value extends PrimitiveLiteralValue
> extends terminalNode {
    constructor(public value: Value) {
        super()
    }

    allows(args: Node.Allows.Args) {
        if (args.data === this.value) {
            return true
        }
        args.diagnostics.push(
            new Node.Allows.UnassignableDiagnostic(this.toString(), args)
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
