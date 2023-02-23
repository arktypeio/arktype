---
hide_table_of_contents: true
---

# scope

## text

```ts
scope: ScopeParser
```

---

## hide_table_of_contents: true

# Scope

## text

```ts
export declare class Scope<context extends ScopeContext = any> {
    #private
    aliases: Dict
    name: string
    config: ScopeConfig
    parseCache: FreezingCache<Node>
    constructor(aliases: Dict, opts?: ScopeOptions)
    getAnonymousQualifiedName(base: AnonymousTypeName): QualifiedTypeName
    addAnonymousTypeReference(referencedType: Type, ctx: ParseContext): Node
    get infer(): exportsOf<context>
    compile(): Space<exportsOf<context>>
    addParsedReferenceIfResolvable(
        name: name<context>,
        ctx: ParseContext
    ): boolean
    resolve(name: name<context>): Type
    resolveNode(node: Node): ResolvedNode
    resolveTypeNode(node: Node): TypeNode
    expressions: Expressions<resolutions<context>>
    intersection: import("./expressions.js").BinaryExpressionParser<
        resolutions<context>,
        "&"
    >
    union: import("./expressions.js").BinaryExpressionParser<
        resolutions<context>,
        "|"
    >
    arrayOf: import("./expressions.js").UnaryExpressionParser<
        resolutions<context>,
        "[]"
    >
    keyOf: import("./expressions.js").UnaryExpressionParser<
        resolutions<context>,
        "keyof"
    >
    valueOf: import("./expressions.js").UnvalidatedExpressionParser<
        resolutions<context>,
        "==="
    >
    instanceOf: import("./expressions.js").UnvalidatedExpressionParser<
        resolutions<context>,
        "instanceof"
    >
    narrow: import("./expressions.js").FunctionalExpressionParser<
        resolutions<context>,
        "=>"
    >
    morph: import("./expressions.js").FunctionalExpressionParser<
        resolutions<context>,
        "|>"
    >
    type: TypeParser<resolutions<context>>
    isResolvable(name: string): unknown
}
```
