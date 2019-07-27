import { createMuiTheme } from "@material-ui/core"
import { ThemeOptions } from "@material-ui/core/styles/createMuiTheme"

const customizations: ThemeOptions = {
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

export const theme = createMuiTheme(customizations)
