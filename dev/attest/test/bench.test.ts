import { bench } from "../src/main.js"

type MakeComplexType<S extends string> = S extends `${infer head}${infer tail}`
    ? head | tail | MakeComplexType<tail>
    : S

bench("bench type", () => {
    return [] as any as MakeComplexType<"defenestration">
}).types()
