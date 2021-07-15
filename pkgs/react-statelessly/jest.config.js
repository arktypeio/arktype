import { getJestConfig } from "@re-do/configs"

export default {
    ...getJestConfig(),
    testEnvironment: "jsdom",
    setupFiles: ["./jest.setup.js"]
}
