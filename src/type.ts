import type { CheckResult } from "./nodes/traverse.js"
import type { TypeNode } from "./nodes/type.js"
import type { ParsedMorph } from "./parse/ast/morph.js"
import {
    as,
    type inferDefinition,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.js"
import type { Scope } from "./scope.js"
import { CompiledFunction, type evaluate } from "./utils/generics.js"
import type { BuiltinClass } from "./utils/objectKinds.js"
import { Path } from "./utils/paths.js"

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

// const t = initializeType("λtype", def, config, this)
// const ctx = this.#initializeContext(t)
// const root = parseDefinition(def, ctx)
// t.node = deepFreeze(root)
// // TODO: refactor
// // TODO: each node should compile completely or until
// // it hits a loop with itself. it should rely on other nodes that
// // have been compiled the same way, parametrized with the current path.
// t.ts = t.node.compile(new CompilationState(t))
// t.traverse = createTraverse(t.name, t.ts)
// t.check = (data) => {
//     const state = new TraversalState(t)
//     t.traverse(data, state)
//     const result = new CheckResult(state)
//     if (state.problems.count) {
//         result.problems = state.problems
//     } else {
//         for (const [o, k] of state.entriesToPrune) {
//             delete o[k]
//         }
//         //state.data
//         result.data = {}
//     }
//     return result
// }
// return t

export class Type<t = unknown> extends CompiledFunction<
    [data: unknown],
    CheckResult<inferOut<t>>
> {
    declare [as]: t
    declare infer: inferOut<t>
    declare inferIn: inferIn<t>

    root: TypeNode

    constructor(public definition: unknown, public scope: Scope) {
        const root = parseDefinition(definition, { path: new Path(), scope })
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
