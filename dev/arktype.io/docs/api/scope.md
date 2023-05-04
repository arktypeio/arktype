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
export declare class Scope<context extends ScopeInferenceContext = any> {
    #private
    aliases: Dict
    infer: exportsOf<context>
    readonly config: ScopeConfig
    constructor(aliases: Dict, opts?: ScopeOptions)
    type: TypeParser<resolutions<context>>
    maybeResolve(name: name<context>): Type | undefined
    compile(): Space<this["infer"]>
}
```
