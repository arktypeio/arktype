import { resolve } from "path"
import HtmlWebpackPlugin from "html-webpack-plugin"
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin"
import merge from "webpack-merge"
import {
    Configuration,
    IgnorePlugin,
    NamedModulesPlugin,
    HotModuleReplacementPlugin,
    NoEmitOnErrorsPlugin
} from "webpack"
import ForkTsCheckerPlugin from "fork-ts-checker-webpack-plugin"

export const env = process.env.NODE_ENV as any
export const isDev = () => env === "development"

export const commonConfig: Configuration = {
    mode: env,
    devtool: isDev() ? "inline-source-map" : "source-map",
    context: __dirname,
    node: {
        __dirname: false,
        __filename: false
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
        plugins: [new TsconfigPathsPlugin()],
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

export const webConfig: Configuration = merge.smart(commonConfig, {
    module: {
        rules: [
            {
                test: /\.(jpg|png|svg|ico|icns|woff|woff2)$/,
                loader: "file-loader"
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
        new IgnorePlugin(/\/iconv-loader$/),
        new HtmlWebpackPlugin({
            template: resolve(__dirname, "template.html")
        })
    ]
})

export const rendererConfig: Configuration = merge.smart(webConfig, {
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

const baseDevServerConfig: Configuration = {
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
        new NamedModulesPlugin(),
        new HotModuleReplacementPlugin(),
        new NoEmitOnErrorsPlugin()
    ]
}

export const devServerConfig = {
    ...baseDevServerConfig,
    devServer: {
        historyApiFallback: true,
        hot: true,
        writeToDisk: true
    }
}
