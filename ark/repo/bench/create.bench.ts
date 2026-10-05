import { bench } from "@ark/attest"
import * as v from "valibot"
import { moltar, moltarData } from "./scenarios.ts"

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
