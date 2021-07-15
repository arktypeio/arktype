module.exports = {
    stories: ["../src/**/*.stories.tsx"],
    addons: ["@storybook/addon-essentials"],
    webpackFinal: (config: any) => {
        config.rules
        return config
    }
}
