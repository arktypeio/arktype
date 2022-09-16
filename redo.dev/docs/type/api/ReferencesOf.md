# ReferencesOf

## tags

```ts
undefined
```

## text

```ts
export declare type ReferencesOf<
    Def,
    Dict,
    Options extends References.TypeOptions = {}
> = Merge<
    {
        filter: string
        preserveStructure: false
        format: "list"
    },
    Options
> extends References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          Root.References<Def, Dict, PreserveStructure>,
          Filter,
          Format
      >
    : {}
```
