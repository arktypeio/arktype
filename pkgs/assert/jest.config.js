export default {
    extensionsToTreatAsEsm: [".ts", ".tsx"],
    transform: {
        "^.+\\.(t|j)sx?$": ["@swc/jest"]
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.jsx?$": "$1"
    },
    verbose: true
}
