import {
    createTheme,
    Theme as MuiTheme,
    PaletteColor
} from "@mui/material/styles"

export type Theme = MuiTheme & {
    palette: {
        accent: PaletteColor
    }
}

export const theme = createTheme({
    palette: {
        primary: {
            main: "#162b79",
            dark: "#264bcf"
        },
        secondary: {
            main: "#ffc40c"
        },
        // @ts-ignore
        accent: {
            main: "#c80815"
        }
    }
}) as Theme
