import type { ParsedMorph } from "../parse/ast/morph.ts"
import {
    type inferDefinition,
    parseDefinition,
    type validateDefinition
} from "../parse/definition.ts"
import type { conform, evaluate, List } from "../utils/generics.ts"
import type { BuiltinClass } from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import type {
    ConstraintsDefinition,
    inferConstraints,
    validateConstraints
} from "./constraints.ts"
import { Constraints } from "./constraints.ts"
import type { ComparisonState } from "./node.ts"
import { Node } from "./node.ts"
import { branchwiseIntersection } from "./union.ts"

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

const isConstraintsArray = (definition: unknown): definition is Constraints[] =>
    Array.isArray(definition) &&
    definition.every((_) => _ instanceof Constraints)

type validateBranches<branches extends List<ConstraintsDefinition>> = conform<
    branches,
    { [i in keyof branches]: validateConstraints<branches[i]> }
>

type inferBranches<branches extends List<ConstraintsDefinition>> = {
    [i in keyof branches]: inferConstraints<branches[i]>
}[number]

export class Type<t = unknown> extends Node<typeof Type, t> {
    constructor(public definition: unknown) {
        const rule = isConstraintsArray(definition)
            ? definition
            : parseDefinition(definition, { path: new Path() }).rule
        super(Type, rule)
    }

    static from<branches extends List<ConstraintsDefinition>>(
        ...branches: validateBranches<branches>
    ) {
        return new Type<inferBranches<branches>>(
            branches.map((branch) => Constraints.from(branch))
        )
    }

    static compile(rule: List<Constraints>) {
        return `${rule}`
    }

    static intersection(l: Type, r: Type, s: ComparisonState): Type {
        if (l === r) {
            return l
        }
        if (l.rule.length === 1 && r.rule.length === 1) {
            const result = Constraints.intersection(l.rule[0], r.rule[0], s)
            return result.isDisjoint() ? result : new Type([result])
        }
        const branches = branchwiseIntersection(l.rule, r.rule, s)
        return branches.length
            ? new Type(branches)
            : s.addDisjoint("union", l, r)
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
