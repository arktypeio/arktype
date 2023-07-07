import type { Dict } from "@arktype/utils"
import { fromEntries, spliterate } from "@arktype/utils"
import { hasArkKind } from "../../compiler/registry.js"
import { NodeBase } from "../base.js"
import type { IndexedPropInput } from "./indexed.js"
import {
    compileArray,
    compileIndexed,
    extractArrayIndexRegex
} from "./indexed.js"
import type { NamedPropInput } from "./named.js"
import { compileNamedProps } from "./named.js"

export class PropertiesNode extends NodeBase<[], {}> {
    readonly kind = "properties"

    constructor() {}

    describe() {
        const entries = named.map(({ key, value }): [string, string] => {
            return [`${key.name}${key.optional ? "?" : ""}`, value.toString()]
        })
        for (const entry of indexed) {
            entries.push([`[${entry.key}]`, entry.value.toString()])
        }
        return JSON.stringify(fromEntries(entries))
    }

    compile() {
        const [named, indexed] = spliterate(rule, isNamed)
        if (indexed.length === 0) {
            return compileNamedProps(named, ctx)
        }
        if (indexed.length === 1) {
            // if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
            const indexMatcher = extractArrayIndexRegex(indexed[0].key)
            if (indexMatcher) {
                return compileArray(indexMatcher, indexed[0].value, named, ctx)
            }
        }
        return compileIndexed(named, indexed, ctx)
    }

    getReferences() {
        return entries.flatMap((entry) =>
            hasArkKind(entry.key, "node") &&
            // since array indices have a special compilation process, we
            // don't need to store a reference their type
            !extractArrayIndexRegex(entry.key)
                ? [
                      entry.key,
                      ...entry.key.references,
                      entry.value,
                      ...entry.value.references
                  ]
                : [entry.value, ...entry.value.references]
        )
    }
}

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends readonly IndexedPropInput[] = readonly IndexedPropInput[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Dict<string, NamedPropInput>
