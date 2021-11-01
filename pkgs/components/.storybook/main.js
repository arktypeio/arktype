const { dirname } = require("path")
const { resolveModulesWithoutJsExtension } = require("@re-do/node")

module.exports = {
    stories: ["../src/**/*.stories.tsx"],
    addons: ["@storybook/addon-essentials"],
    core: { builder: "storybook-builder-vite" },
    viteFinal: (config) => {
        const resolvedBuilder = require.resolve("storybook-builder-vite")
        // https://github.com/eirslett/storybook-builder-vite/issues/55
        config.root = dirname(resolvedBuilder)
        config.resolve.alias = [resolveModulesWithoutJsExtension]
        return config
    }
}
