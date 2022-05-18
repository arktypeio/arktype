import { build, emptyDir } from "dnt"
import packageJson from "./package.json" assert { type: "json" }
import importMap from "../import_map.json" assert { type: "json" }

Deno.chdir("..")

await emptyDir("./assert/out")

type DntMappings = NonNullable<Parameters<typeof build>[0]["mappings"]>

const { dependencies } = packageJson
const imports: Record<string, string> = importMap.imports

const ignoreDeps: string[] = []
const customMappings: DntMappings = {
    "./tools/src/index.ts": {
        name: "@re-/tools",
        version: dependencies["@re-/tools"]
    }
}
const preservedPackageJsonKeys = [
    "name",
    "version",
    "description",
    "author",
    "repository",
    "type"
]

const { mappings, errors } = Object.entries(dependencies).reduce(
    ({ mappings, errors }, [name, version]) => {
        if (ignoreDeps.includes(name)) {
            return { mappings, errors }
        }
        if (name in imports) {
            if (imports[name] in customMappings) {
                return {
                    mappings,
                    errors
                }
            }
            if (!imports[name].includes(version)) {
                return {
                    mappings,
                    errors: [
                        ...errors,
                        `Version mismatch for ${name}: import '${imports[name]}' did not include ${version}.`
                    ]
                }
            }
            return {
                mappings: { ...mappings, [imports[name]]: { name, version } },
                errors
            }
        }
        return {
            mappings,
            errors: [
                ...errors,
                `Dependency ${name} not found in imports. If you'd like to exclude it, specify it in excludeDeps.`
            ]
        }
    },
    {
        mappings: customMappings,
        errors: [] as string[]
    }
)

if (errors.length) {
    throw new Error(
        `The following errors must be resolved before building:\n${errors.join(
            "\n"
        )}`
    )
}

const outPackageJson: any = Object.fromEntries(
    Object.entries(packageJson).filter(([k, v]) =>
        preservedPackageJsonKeys.includes(k)
    )
)

outPackageJson.scripts = {
    test: "npx ts-node --esm -T test_runner.ts"
}

Deno.copyFileSync("./assert/nodeTestRunner.ts", "./assert/out/test_runner.ts")

await build({
    entryPoints: ["./assert/src/index.ts"],
    outDir: "./assert/out",
    rootTestDir: "./assert/tests",
    shims: {
        deno: true
    },
    packageManager: "pnpm",
    importMap: "./import_map.json",
    package: outPackageJson,
    mappings
})

Deno.copyFileSync("../LICENSE", "./assert/out/LICENSE")
Deno.copyFileSync("./assert/README.md", "./assert/out/README.md")
