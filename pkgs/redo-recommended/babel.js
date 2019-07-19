const { declare } = require("@babel/helper-plugin-utils")

const isAvailable = pkg => {
    try {
        require(pkg)
        return true
    } catch {
        return false
    }
}

const presets = [
    [
        require("@babel/preset-env"),
        {
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

if (process.env.NODE_ENV === "development") {
    if (isAvailable("react-hot-loader/babel")) {
        plugins.push("react-hot-loader/babel")
    } else {
        console.warn(
            "'react-hot-loader' wasn't resolved and won't be available."
        )
    }
}

module.exports = declare((api, opts) => {
    return { plugins, presets }
})
