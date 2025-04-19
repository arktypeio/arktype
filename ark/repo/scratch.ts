import { type } from "arktype"

// type-checked, runtime-enforced functions from .ts or .js
const safe = type.fn(
	"string",
	"number = 0.1"
)((name, version) => console.log(`${name}@${version} is safe AF.`))

safe("arktype", 2.2) // "arktype@2.2 is safe AF"
safe("shitescript", "*" as any) // must be a number (was string)
