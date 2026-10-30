// writes ata's ahead-of-time string validators into schema-benchmarks'
// ata-validator entry (libraries/ata-validator/compiled/), as `ata build`
// writes a schema's module, for the "compiled" variant ata.patch adds beside
// its runtime Validator. Only the string formats: ata won't write the product
// schema standalone, since its Date check is a withKeywords() wrapper
// SB=<schema-benchmarks clone> node sb/ataCompiled.ts
import { mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const libraries = join(process.env.SB!, "schemas/libraries")
const require = createRequire(join(libraries, "index.ts"))
const { Validator } = require("ata-validator")
const { toStandaloneModule } = require("ata-validator/aot")

const formats = [
	"date-time",
	"date",
	"time",
	"duration",
	"email",
	"uuid",
	"ipv4",
	"ipv6"
]

const out = join(libraries, "ata-validator/compiled")
mkdirSync(out, { recursive: true })
for (const format of formats) {
	writeFileSync(
		join(out, `${format}.mjs`),
		toStandaloneModule(new Validator({ type: "string", format }), {
			format: "esm"
		})
	)
}
writeFileSync(
	join(out, "index.mjs"),
	`${formats.map((format, i) => `import { isValid as f${i} } from "./${format}.mjs"`).join("\n")}\nexport const isValid = { ${formats.map((format, i) => `"${format}": f${i}`).join(", ")} }\n`
)
