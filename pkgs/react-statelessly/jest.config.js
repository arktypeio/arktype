import { getJestConfig } from "@re-do/node-utils"

export default {
    ...getJestConfig(),
    testEnvironment: "jsdom",
    setupFiles: ["./jest.setup.js"]
}
