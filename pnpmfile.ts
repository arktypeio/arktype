type PackageManifest = {
	name: string
	dependencies?: Record<string, string>
	peerDependencies?: Record<string, string>
}

// keep in sync with the ts6 catalog in pnpm-workspace.yaml
const jsApiTypeScriptVersion = "6.0.3"

// these use TypeScript's JS API, which TS 7 doesn't have, so they get their
// own TS 6 rather than resolving the workspace's TypeScript as a peer
const needsJsApi = (name: string) =>
	name === "typescript-eslint" ||
	name.startsWith("@typescript-eslint/") ||
	name === "tsup" ||
	name === "rollup-plugin-dts" ||
	name === "knip"

export const hooks = {
	readPackage: (pkg: PackageManifest): PackageManifest => {
		if (needsJsApi(pkg.name) && pkg.peerDependencies?.typescript) {
			delete pkg.peerDependencies.typescript
			pkg.dependencies = {
				...pkg.dependencies,
				typescript: jsApiTypeScriptVersion
			}
		}
		return pkg
	}
}
