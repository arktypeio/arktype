# Infer

## tags

```ts
undefined
```

## text

```ts
export declare type Infer<Def, S extends Space> = Root.Infer<
    Def,
    Node.InferenceContext.From<{
        Dict: S["Dict"]
        Meta: S["Meta"]
        Seen: {}
    }>
>
```
