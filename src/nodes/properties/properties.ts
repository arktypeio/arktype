import type { Dict } from "@arktype/utils"
import { cached, fromEntries } from "@arktype/utils"
import type { CompilationContext } from "../../compiler/compile.js"
import { hasArkKind } from "../../compiler/registry.js"
import { NodeBase } from "../base.js"
import { node } from "../parse.js"
import { TypeNode } from "../type.js"
import type { IndexedPropInput, IndexedPropRule } from "./indexed.js"
import {
    compileArray,
    compileIndexed,
    extractArrayIndexRegex
} from "./indexed.js"
import type { NamedPropInput, NamedPropRule } from "./named.js"
import { compileNamedProps } from "./named.js"

export type PropEntries = readonly PropEntry[]

export type PropEntry = NamedPropRule | IndexedPropRule

export type NamedEntries = readonly NamedPropRule[]

export type IndexedEntries = readonly IndexedPropRule[]

export type PropsMeta = {}

export class PropertiesNode extends NodeBase {
    constructor(
        public readonly entries: PropEntries,
        public readonly meta: {}
    ) {
        super()
    }

    readonly kind = "properties"
    readonly named: NamedEntries = this.entries.filter(isNamed)
    readonly indexed: IndexedEntries = this.entries.filter(isIndexed)

    readonly literalKeys = this.named.map((prop) => prop.key.name)
    readonly namedKeyOf = cached(() => node.literal(...this.literalKeys))
    readonly indexedKeyOf = cached(
        () =>
            new TypeNode(
                this.indexed.flatMap((entry) => entry.key.branches),
                this.meta
            )
    )
    readonly keyof = cached(() => this.namedKeyOf().or(this.indexedKeyOf()))

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

    get(key: string | TypeNode) {
        return typeof key === "string"
            ? this.named.find((entry) => entry.value.branches)?.value
            : this.indexed.find((entry) => entry.key.equals(key))?.value
    }

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

const isIndexed = (rule: PropEntry): rule is IndexedPropRule =>
    hasArkKind(rule.key, "node")

const isNamed = (rule: PropEntry): rule is NamedPropRule => !isIndexed(rule)
