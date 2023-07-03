import type { Dict, listable } from "../../../dev/utils/src/main.js"
import { type CompilationContext, compileCheck } from "../../compile/compile.js"
import type { PrimitiveNodeKind } from "../kinds.js"
import {
    type BaseNode,
    type BaseNodeImplementation,
    defineNodeKind,
    type NodeExtensions
} from "../node.js"

export type Constraint<
    kind extends PrimitiveNodeKind = PrimitiveNodeKind,
    rule = unknown,
    meta extends Dict = Dict
> = {
    kind: kind
    rule: rule
    meta: meta
}

export const composeConstraintIntersection = <
    constraint extends Constraint
>() => {}

type BaseConstraints = readonly Constraint[]

// if a single constraint is valid, allow it to be passed on its own as input
type extractInputFormats<constraints extends BaseConstraints> =
    constraints["length"] extends 1
        ? constraints[0]["rule"]
        : number extends constraints["length"]
        ? listable<constraints[number]["rule"]>
        : // if the number of constraints is a literal but not 1, map them to preserve the corresponding rule types
          { [i in keyof constraints]: constraints[i]["rule"] }

export interface PrimitiveNode<constraints extends BaseConstraints>
    extends BaseNode<
        constraints[number]["kind"],
        extractInputFormats<constraints>
    > {
    readonly children: constraints
}

export type BasePrimitiveNode = PrimitiveNode<
    readonly Constraint<any, any, any>[]
>

type PrimitiveNodeImplementation<node extends BasePrimitiveNode> = Omit<
    BaseNodeImplementation<node>,
    "compile"
> & {
    compileRule: (
        rule: node["children"][number]["rule"],
        ctx: CompilationContext
    ) => string
}

export const definePrimitiveNode = <node extends BasePrimitiveNode>(
    def: PrimitiveNodeImplementation<node>,
    extensions: NodeExtensions<node>
) =>
    defineNodeKind<node>(
        {
            ...def,
            compile: (children, ctx) =>
                children
                    .map((constraint) =>
                        compileCheck(
                            constraint.kind,
                            constraint.rule,
                            def.compileRule(constraint.rule, ctx),
                            ctx
                        )
                    )
                    .join("\n")
        },
        extensions
    )
