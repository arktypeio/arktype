# ArkType in Markdown

Inline code `type("string | number")` and prose type("string") stay as they are.

```ts
import { type } from "arktype"

const User = type({ name: "string", "age?": "number.integer" })
```

```typescript
const Tags = type(["string", "[]"])
```

```tsx
const Props = type({ label: "string | number" })
```

```js
const Id = type("string.uuid")
```

```jsx
const El = <div title="x">{type("string").expression}</div>
```

```json
{ "type": "string | number" }
```
