"use strict"
var __importDefault =
    (this && this.__importDefault) ||
    function(mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, "__esModule", { value: true })
const path_1 = require("path")
const html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"))
const tsconfig_paths_webpack_plugin_1 = require("tsconfig-paths-webpack-plugin")
const webpack_merge_1 = __importDefault(require("webpack-merge"))
const webpack_1 = require("webpack")
exports.env = process.env.NODE_ENV
exports.isDev = () => exports.env === "development"
exports.makeConfig = ({ base, entry, devServer }, merged = []) => {
    return webpack_merge_1.default.smart(
        baseOptions[base],
        { entry },
        devServer ? devServerOptions : {},
        ...merged
    )
}
const commonOptions = {
    mode: exports.env,
    context: __dirname,
    devtool: exports.isDev() ? "inline-source-map" : "source-map",
    node: {
        __dirname: false,
        __filename: false
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
        plugins: [new tsconfig_paths_webpack_plugin_1.TsconfigPathsPlugin()],
        alias: {
            ws: "isomorphic-ws"
        }
    },
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                loader: "babel-loader",
                exclude: /node_modules/
            },
            {
                type: "javascript/auto",
                test: /\.mjs$/,
                use: []
            }
        ]
    }
}
const webOptions = webpack_merge_1.default.smart(commonOptions, {
    module: {
        rules: [
            {
                test: /\.(jpg|png|ico|icns|woff|woff2)$/,
                loader: "file-loader"
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: "babel-loader"
                    },
                    {
                        loader: "react-svg-loader",
                        options: {
                            jsx: true
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                loaders: ["style-loader", "css-loader"]
            },
            {
                test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
                resolve: {
                    aliasFields: ["main"]
                }
            }
        ]
    },
    plugins: [
        new webpack_1.IgnorePlugin(/\/iconv-loader$/),
        new html_webpack_plugin_1.default({
            template: path_1.resolve(__dirname, "template.html")
        })
    ]
})
const injectableOptions = webpack_merge_1.default.smart(webOptions, {
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                loader: "ts-loader",
                exclude: /node_modules/
            }
        ]
    }
})
const rendererOptions = webpack_merge_1.default.smart(webOptions, {
    target: "electron-renderer",
    resolve: {
        /*
    Override default value ["browser"] since we have enabled node integration
    And have access to more than we would in a basic web environment.
    In particular, this allows us to import puppeteer, which specifies a
    "browser" field in its package.json that breaks our ability to import it.
    */
        aliasFields: []
    }
})
const devServerOptions = {
    resolve: {
        alias: {
            "react-dom": "@hot-loader/react-dom"
        }
    },
    entry: [
        "react-hot-loader/patch",
        "webpack-dev-server/client?http://localhost:8080",
        "webpack/hot/only-dev-server"
    ],
    plugins: [
        new webpack_1.NamedModulesPlugin(),
        new webpack_1.HotModuleReplacementPlugin(),
        new webpack_1.NoEmitOnErrorsPlugin()
    ],
    devServer: {
        historyApiFallback: true,
        hot: true,
        writeToDisk: true
    }
}
const baseOptions = {
    common: commonOptions,
    web: webOptions,
    injectable: injectableOptions,
    renderer: rendererOptions
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwrQkFBOEI7QUFDOUIsOEVBQW1EO0FBQ25ELGlGQUFtRTtBQUNuRSxrRUFBaUM7QUFDakMscUNBTWdCO0FBR0gsUUFBQSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFlLENBQUE7QUFDakMsUUFBQSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUMsV0FBRyxLQUFLLGFBQWEsQ0FBQTtBQVNuQyxRQUFBLFVBQVUsR0FBRyxDQUN0QixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFxQixFQUM3QyxTQUFtQyxFQUFFLEVBQ3ZDLEVBQUU7SUFDQSxPQUFPLHVCQUFLLENBQUMsS0FBSyxDQUNkLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFDakIsRUFBRSxLQUFLLEVBQUUsRUFDVCxTQUFTLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQ2pDLEdBQUcsTUFBTSxDQUNaLENBQUE7QUFDTCxDQUFDLENBQUE7QUFFRCxNQUFNLGFBQWEsR0FBa0I7SUFDakMsSUFBSSxFQUFFLFdBQUc7SUFDVCxPQUFPLEVBQUUsY0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7SUFDakMsT0FBTyxFQUFFLGFBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsWUFBWTtJQUNyRCxJQUFJLEVBQUU7UUFDRixTQUFTLEVBQUUsS0FBSztRQUNoQixVQUFVLEVBQUUsS0FBSztLQUNwQjtJQUNELE9BQU8sRUFBRTtRQUNMLFVBQVUsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDO1FBQzNELE9BQU8sRUFBRSxDQUFDLElBQUksbURBQW1CLEVBQUUsQ0FBQztRQUNwQyxLQUFLLEVB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
