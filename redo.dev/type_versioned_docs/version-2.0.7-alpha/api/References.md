# References

## tags

```ts
undefined
```

## text

```ts
export declare type References<
    Def,
    Dict,
    Options extends Node.References.TypeOptions = {}
> = Merge<
    {
        filter: string
        preserveStructure: false
        format: "list"
    },
    Options
> extends Node.References.TypeOptions<
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
