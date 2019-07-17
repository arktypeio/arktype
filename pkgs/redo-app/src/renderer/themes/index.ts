import { createMuiTheme } from "@material-ui/core"
import { ThemeOptions } from "@material-ui/core/styles/createMuiTheme"
import merge from "deepmerge"

const commonConfig: ThemeOptions = {
    palette: {
        primary: {
            main: "#2979ff"
        },
        secondary: {
            main: "#ffc400"
        }
    },
    typography: {
        fontFamily: "Ubuntu",
        button: {
            textTransform: "none"
        }
    }
}

const lightConfig: ThemeOptions = merge(commonConfig, {
    palette: {
        type: "light"
    }
})

const darkConfig: ThemeOptions = merge(commonConfig, {
    palette: {
        type: "dark"
    }
})

export const theme = createMuiTheme(lightConfig)
