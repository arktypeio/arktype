import { transformSync } from "esbuild"

// webpack's loader for TypeScript, as an app would configure ts-loader
export default (source: string): string =>
	transformSync(source, { loader: "ts", target: "esnext" }).code
