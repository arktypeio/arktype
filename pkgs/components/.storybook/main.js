module.exports = {
    stories: ["../src/**/*.stories.tsx"],
    addons: ["@storybook/addon-essentials"],
    core: { builder: "storybook-builder-vite" },
    async viteFinal(config, { configType }) {
        const { dirname } = require("path")
        // https://github.com/eirslett/storybook-builder-vite/issues/55
        config.root = dirname(require.resolve("storybook-builder-vite"))
        config.resolve.alias = [{find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1"},  {
        find: /^@material-ui\/icons\/(.*)/,
        replacement: "@material-ui/icons/esm/$1"
    },
    {
        find: /^@material-ui\/core\/(.+)/,
        replacement: "@material-ui/core/es/$1"
    },
    {
        find: /^@material-ui\/core$/,
        replacement: "@material-ui/core/es"
    }]
        config.server.fsServe = undefined
        return config
    }
}
