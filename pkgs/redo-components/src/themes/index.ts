import { createMuiTheme } from "@material-ui/core"

export const defaultTheme = createMuiTheme({
    palette: {
        type: "light",
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
})
