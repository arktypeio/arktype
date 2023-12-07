// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { fromCwd, fromHere, shell, writeJson } from "../fs/main.js"

const isCjs = process.argv.includes("--cjs") || process.env.ARKTYPE_CJS
const cjsTsconfig = fromHere("tsconfig.cjs.json")
const esmTsconfig = fromHere("tsconfig.esm.json")

try {
	shell(`ln -sf ${isCjs ? cjsTsconfig : esmTsconfig} tsconfig.build.json`)
	shell("pnpm tsc --project tsconfig.build.json")
	if (isCjs) {
		writeJson(fromCwd("out", "package.json"), { type: "commonjs" })
	}
} finally {
	shell(`ln -sf ${esmTsconfig} tsconfig.build.json`)
}
