[@re-/model](./model.md) &gt; [declare](./model.declare.md)

## declare variable

<b>Signature:</b>

```typescript
declare: <DeclaredTypeNames extends string[]>(
    ...names: import("@re-/tools").CastWithExclusion<
        DeclaredTypeNames,
        import("@re-/tools").NarrowRecurse<DeclaredTypeNames>,
        []
    >
) => {
    define: DeclaredDefineFunctionMap<
        import("@re-/tools").CastWithExclusion<
            DeclaredTypeNames,
            import("@re-/tools").NarrowRecurse<DeclaredTypeNames>,
            []
        >
    >
    compile: CompileFunction<DeclaredTypeNames>
}
```
