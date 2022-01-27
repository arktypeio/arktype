import { getJestConfig } from "@re-/tools/node"

export default getJestConfig({
    reporters: undefined,
    collectCoverage: true,
    coverageThreshold: {
        global: {
            statements: 90,
            branches: 90,
            functions: 80,
            lines: 90
        }
    },
    moduleNameMapper: {
        "^@re-/model$": "<rootDir>/src"
    }
})
