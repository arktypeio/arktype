import type { Dict } from "@arktype/utils"
import { fromEntries, spliterate } from "@arktype/utils"
import type { CompilationContext } from "../../compiler/compile.js"
import { hasArkKind } from "../../compiler/registry.js"
import { NodeBase } from "../base.js"
import type { IndexedPropInput, IndexedPropRule } from "./indexed.js"
import {
    compileArray,
    compileIndexed,
    extractArrayIndexRegex
} from "./indexed.js"
import type { NamedPropInput, NamedPropRule } from "./named.js"
import { compileNamedProps } from "./named.js"

export type PropEntries = readonly [...NamedProps, ...IndexedProps]

export type NamedProps = readonly NamedPropRule[]

export type IndexedProps = readonly IndexedPropRule[]

export type PropsMeta = {}

export type PropsArgs =
    | readonly [NamedProps, PropsMeta]
    | readonly [NamedProps, IndexedProps, PropsMeta]

export class PropertiesNode extends NodeBase {
    readonly kind = "properties"
    readonly named: NamedProps
    readonly indexed: IndexedProps

    constructor(
        public readonly entries: PropEntries,
        public readonly meta: {}
    ) {
        super()
        const [indexed, named] = spliterate(
            this.entries,
            (entry): entry is IndexedPropRule => hasArkKind(entry.key, "node")
        )
        this.named = named
        this.indexed = indexed
    }

    readonly references = this.entries.flatMap((entry) =>
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

    describe() {
        const entries = this.named.map(({ key, value }): [string, string] => {
            return [`${key.name}${key.optional ? "?" : ""}`, value.toString()]
        })
        for (const entry of this.indexed) {
            entries.push([`[${entry.key}]`, entry.value.toString()])
        }
        return JSON.stringify(fromEntries(entries))
    }

    compile(ctx: CompilationContext) {
        if (this.indexed.length === 0) {
            return compileNamedProps(this.named, ctx)
        }
        if (this.indexed.length === 1) {
            // if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
            const indexMatcher = extractArrayIndexRegex(this.indexed[0].key)
            if (indexMatcher) {
                return compileArray(
                    indexMatcher,
                    this.indexed[0].value,
                    this.named,
                    ctx
                )
            }
        }
        return compileIndexed(this.named, this.indexed, ctx)
    }
}

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends readonly IndexedPropInput[] = readonly IndexedPropInput[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Dict<string, NamedPropInput>
