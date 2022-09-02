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
    Options extends Base.References.TypeOptions = {}
> = Merge<
    {
        filter: string
        preserveStructure: false
        format: "list"
    },
    Options
> extends Base.References.TypeOptions<
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
