# Root

## tags

```ts
undefined
```

## text

```ts
export declare namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage<Def>
        : Def extends Obj.Unmapped | Literal.Definition
        ? Def
        : Obj.Validate<Def, Dict>
    export type TypeOf<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Str.TypeOf<Def, Dict, Seen>
        : Def extends BadDefinitionType
        ? unknown
        : Def extends Literal.Definition
        ? Def
        : Obj.TypeOf<Def, Dict, Seen>
    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Def extends Literal.Definition
        ? [Literal.DefToString<Def>]
        : Def extends object
        ? Obj.References<Def, Dict, PreserveStructure>
        : []
    export type BadDefinitionType = Function | symbol
    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        `Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`
    export const parse: Base.Parsing.Parser<unknown>
    export {}
}
```
