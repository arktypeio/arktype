const { declare } = require("@babel/helper-plugin-utils")

const presets = [
    [
        require("@babel/preset-env"),
        {
            useBuiltIns: "usage",
            corejs: 3,
            targets: {
                node: "current"
            }
        }
    ],
    require("@babel/preset-typescript"),
    require("@babel/preset-react")
]

const plugins = [
    [
        require("@babel/plugin-transform-runtime"),
        {
            corejs: 3
        }
    ],
    [
        require("@babel/plugin-proposal-decorators"),
        {
            legacy: true
        }
    ],
    [
        require("@babel/plugin-proposal-class-properties"),
        {
            loose: true
        }
    ],
    require("@babel/plugin-proposal-object-rest-spread"),
    require("babel-plugin-transform-typescript-metadata")
]

const reactHotLoaderPlugin = require("react-hot-loader/babel")

module.exports = declare((api, opts) => {
    // if (opts.node) {
    //     presets[0][1].targets = { node: "current" }
    // }
    if (opts.hotReloading) {
        plugins.push(reactHotLoaderPlugin)
    }
    return { presets, plugins }
})
