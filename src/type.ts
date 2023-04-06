import {
    type ConstraintsDefinition,
    ConstraintsNode,
    type inferConstraints,
    type validateConstraints
} from "./nodes/constraints.ts"
import type { Node } from "./nodes/node.ts"
import type { CheckResult } from "./nodes/traverse.ts"
import { TypeNode } from "./nodes/type.ts"
import type { ParsedMorph } from "./parse/ast/morph.ts"
import {
    as,
    type inferDefinition,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.ts"
import {
    CompiledFunction,
    type conform,
    type evaluate,
    type List
} from "./utils/generics.ts"
import type { BuiltinClass } from "./utils/objectKinds.ts"
import { Path } from "./utils/paths.ts"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

// Reuse the validation result to determine if the type will be successfully created.
// If it will, infer it and create a validator. Otherwise, return never.
export type parseType<def, $> = [def] extends [validateDefinition<def, $>]
    ? Type<inferDefinition<def, $>>
    : never

type validateBranches<branches extends List<ConstraintsDefinition>> = conform<
    branches,
    { [i in keyof branches]: validateConstraints<branches[i]> }
>

type inferBranches<branches extends List<ConstraintsDefinition>> = {
    [i in keyof branches]: inferConstraints<branches[i]>
}[number]

export const node = <branches extends List<ConstraintsDefinition>>(
    ...branches: validateBranches<branches>
): Type<inferBranches<branches>> =>
    new Type(
        new TypeNode(branches.map((branch) => ConstraintsNode.from(branch)))
    )

export class Type<t = unknown> extends CompiledFunction<
    [data: unknown],
    CheckResult<inferOut<t>>
> {
    root: TypeNode

    constructor(public definition: unknown) {
        const root = parseDefinition(definition, { path: new Path() })
        super("data", "")
        this.root = root
    }

    // TODO: convert to definition type
    // static from<branches extends List<ConstraintsDefinition>>(
    //     ...branches: validateBranches<branches>
    // ) {
    //     return new Type<inferBranches<branches>>(
    //         branches.map((branch) => Constraints.from(branch))
    //     )
    // }

    declare [as]: t

    declare infer: inferOut<t>

    declare inferIn: inferIn<t>

    // TODO: don't mutate
    allows(data: unknown): data is inferIn<t> {
        return !data
    }

    assert(data: unknown): inferOut<t> {
        const result = this.call(null, data)
        return result.problems ? result.problems.throw() : result.data
    }

    // toArray() {
    //     return {
    //         object: {
    //             instance: Array,
    //             props: {
    //                 [mappedKeys.index]: this
    //             }
    //         }
    //     }
    // }
}

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeOptions = evaluate<{
    keys?: KeyCheckKind
    mustBe?: string
}>

export type TypeConfig = TypeOptions

export type inferIn<t> = inferMorphs<t, "in">

export type inferOut<t> = inferMorphs<t, "out">

type inferMorphs<t, io extends "in" | "out"> = t extends ParsedMorph<
    infer i,
    infer o
>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends BuiltinClass | ((...args: any[]) => any)
        ? t
        : { [k in keyof t]: inferMorphs<t[k], io> }
    : t
