import { bench } from "@ark/attest"
import * as v from "valibot"
import { moltar, moltarData, product, productData } from "./scenarios.ts"

let bound = 1e9

// arktype retains every type it creates, so take few samples
const options = { until: { count: 20 } }

bench("moltar create (arktype)", () => moltar.arktype(bound++), options).median(
	[858.55, "us"]
)

bench("moltar create (zod)", () => moltar.zod(bound++), options).median([
	132.92,
	"us"
])

bench("moltar create (valibot)", () => moltar.valibot(bound++), options).median(
	[11.52, "us"]
)

bench(
	"moltar create + parse (arktype)",
	() => moltar.arktype(bound++)(moltarData),
	options
).median([1.41, "ms"])

bench(
	"moltar create + parse (zod)",
	() => moltar.zod(bound++).safeParse(moltarData),
	options
).median([186.43, "us"])

bench(
	"moltar create + parse (valibot)",
	() => v.safeParse(moltar.valibot(bound++), moltarData),
	options
).median([9.07, "us"])

bench(
	"product create (arktype)",
	() => product.arktype(bound++),
	options
).median([4.57, "ms"])

bench("product create (zod)", () => product.zod(bound++), options).median([
	795.99,
	"us"
])

bench(
	"product create (valibot)",
	() => product.valibot(bound++),
	options
).median([58.06, "us"])

bench(
	"product create + parse (arktype)",
	() => product.arktype(bound++)(productData),
	options
).median([5.11, "ms"])

bench(
	"product create + parse (zod)",
	() => product.zod(bound++).safeParse(productData),
	options
).median([814.79, "us"])

bench(
	"product create + parse (valibot)",
	() => v.safeParse(product.valibot(bound++), productData),
	options
).median([67.87, "us"])
