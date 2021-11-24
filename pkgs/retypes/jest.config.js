import { getJestConfig } from "@re-do/node"
import { stringify } from "@re-do/utils"
import { stdout } from "process"
import tsd from "tsd"

const defaultConfig = getJestConfig()

const getTypeData = async () => {
    stdout.write("Collecting type data...")
    const data = await tsd.default({
        cwd: ".",
        testFiles: ["src/__tests__/**/*.test.ts"]
    })
    stdout.write("✅\n")
    return data
}

export default async () => ({
    ...defaultConfig,
    collectCoverage: true,
    coverageThreshold: {
        global: {
            statements: 90,
            branches: 90,
            functions: 80,
            lines: 90
        }
    },
    globals: {
        ...defaultConfig.globals,
        tsdData: [] // await getTypeData()
    },
    reporters: ["default", "jest-stare"]
})
