[@re-/model](./model.md) &gt; [CreateFunction](./model.createfunction.md)

## CreateFunction type

<b>Signature:</b>

```typescript
export declare type CreateFunction<
    PredefinedSpace extends SpaceDefinition | null
> = <
    Def,
    Options extends ModelConfig = {},
    ActiveSpace extends SpaceDefinition = PredefinedSpace extends null
        ? Options["space"] extends SpaceDefinition
            ? Options["space"]
            : {
                  resolutions: {}
              }
        : PredefinedSpace
>(
    definition: Validate<Narrow<Def>, ActiveSpace["resolutions"]>,
    options?: Narrow<Options> & {
        validate?: {
            validator?: CustomValidator
        }
    }
) => Model<
    Def,
    Evaluate<ActiveSpace>,
    Options["parse"] extends ParseConfig ? Options["parse"] : {}
>
```

<b>References:</b> [SpaceDefinition](./model.spacedefinition.md), [ModelConfig](./model.modelconfig.md), [CustomValidator](./model.customvalidator.md), [ParseConfig](./model.parseconfig.md)
