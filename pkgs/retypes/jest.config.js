import { getJestConfig } from "@re-do/node"

const defaultConfig = getJestConfig()

export default {
    ...defaultConfig,
    globals: {
        "ts-jest": {
            ...defaultConfig.globals["ts-jest"],
            isolatedModules: true
        }
    }
}
