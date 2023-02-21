import { scope } from "arktype"
import { arktypeRelease, types } from "./demo.ts"

const threeSixtyNoTypes = scope(
    {
        installArktype: [
            "package",
            "|>",
            (pkg) => ({
                ...pkg,
                dependencies: [...pkg.dependencies, arktypeRelease]
            })
        ]
    },
    { imports: [types] }
).compile()

const { data, problems } = threeSixtyNoTypes.installArktype({
    name: "your-typesafe-project", version: "3.1.4", dependencies: []
})

console.log(problems?.summary ?? data?.dependencies)
