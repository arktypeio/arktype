[Home](./index.md) &gt; [@re-/model](./model.md) &gt; [CustomValidator](./model.customvalidator.md)

## CustomValidator type

<b>Signature:</b>

```typescript
export declare type CustomValidator = (
    value: unknown,
    errors: ValidationErrors,
    ctx: Omit<InheritableMethodContext<any, any>, "components">
) => string | ValidationErrors
```
