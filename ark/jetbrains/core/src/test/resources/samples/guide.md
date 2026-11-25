# Validating config with ArkType

ArkType definitions read like TypeScript. Use `type("string")` inline, or a fenced block:

```ts
import { type } from "arktype"

const Config = type({
	port: "1024 <= number.integer < 65536",
	"host?": "string.hostname",
	mode: "'dev' | 'prod'"
})

const out = Config({ port: 8080, mode: "dev" })
if (out instanceof type.errors) console.error(out.summary)
```

> **Note**: morphs like `"string.numeric.parse"` change the output type.

1. Install with `pnpm add arktype`
2. Define a type
   - nested *emphasis* and ~~strikethrough~~ text
   - [a link](https://arktype.io/docs) and <https://arktype.io>

| keyword          | meaning             |
| ---------------- | ------------------- |
| `string.email`   | an email address    |
| `number.integer` | an integer          |

```js
const Point = type({ x: "number", y: "number" })
```

```tsx
export const Field = () => <input value={type("string")("x").toString()} />
```

<details>
<summary>HTML in markdown</summary>

Some <kbd>Ctrl</kbd>+<kbd>C</kbd> text.

</details>
