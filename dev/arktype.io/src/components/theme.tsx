import { createTheme, responsiveFontSizes } from "@mui/material"

export type ThemeConfigOptions = {
    isDark: boolean
}

export const getTheme = () =>
    responsiveFontSizes(
        createTheme({
            palette: {
                primary: {
                    main: "#085b92"
                },
                secondary: {
                    main: "#d09847",
                    dark: "#4b3621"
                },
                common: {
                    white: "#fffff0"
                }
            },
            typography: {
                fontFamily: "'Raleway', sans-serif"
            }
        })
    )
