import { bench } from "@ark/attest"
import * as v from "valibot"
import { moltar, moltarData, product, productData } from "./scenarios.ts"

// Every call gets a bound no earlier call used, so arktype builds new nodes
// instead of returning cached ones. "+ parse" includes the first validation,
// when zod compiles its objects and arktype finishes any deferred work.
let bound = 1e9

// arktype retains every type it creates, so cap how many a bench makes
const options = { until: { count: 20 } }

bench(
	"moltar create (arktype)",
	() => moltar.arktype(bound++),
	options
).median()

bench("moltar create (zod)", () => moltar.zod(bound++), options).median()

bench(
	"moltar create (valibot)",
	() => moltar.valibot(bound++),
	options
).median()

bench(
	"moltar create + parse (arktype)",
	() => moltar.arktype(bound++)(moltarData),
	options
).median()

bench(
	"moltar create + parse (zod)",
	() => moltar.zod(bound++).safeParse(moltarData),
	options
).median()

bench(
	"moltar create + parse (valibot)",
	() => v.safeParse(moltar.valibot(bound++), moltarData),
	options
).median()

bench(
	"product create (arktype)",
	() => product.arktype(bound++),
	options
).median()

bench("product create (zod)", () => product.zod(bound++), options).median()

bench(
	"product create (valibot)",
	() => product.valibot(bound++),
	options
).median()

bench(
	"product create + parse (arktype)",
	() => product.arktype(bound++)(productData),
	options
).median()

bench(
	"product create + parse (zod)",
	() => product.zod(bound++).safeParse(productData),
	options
).median()

bench(
	"product create + parse (valibot)",
	() => v.safeParse(product.valibot(bound++), productData),
	options
).median()
