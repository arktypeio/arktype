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
        ? Str.Validate<Def, Dict, Def>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage<Def>
        : Def extends Obj.Leaves
        ? Def
        : Def extends object
        ? Obj.Validate<Def, Dict>
        : Def extends Literal.Definition
        ? Def
        : Base.Parsing.ParseErrorMessage<Base.Parsing.UnknownTypeErrorMessage>
    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Def extends Base.Parsing.ParseErrorMessage
            ? unknown
            : Str.Parse<Def, Dict, Seen>
        : Def extends BadDefinitionType
        ? unknown
        : Def extends object
        ? Obj.Parse<Def, Dict, Seen>
        : Def extends Literal.Definition
        ? Def
        : IsAny<Dict> extends true
        ? any
        : unknown
    export type References<Def, Filter> = Def extends string
        ? Def extends Base.Parsing.ParseErrorMessage
            ? unknown
            : Str.References<Def, Filter>
        : Def extends object
        ? Obj.References<Def, Filter>
        : Def extends Literal.Definition
        ? Base.FilterToTuple<Def, Filter>
        : []
    export type BadDefinitionType = Function | symbol
    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        Base.Parsing.ParseErrorMessage<`Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`>
    export const parse: Base.Parsing.Parser<unknown>
    export {}
}
```
