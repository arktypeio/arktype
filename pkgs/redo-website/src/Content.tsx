import "typeface-ubuntu"
import React from "react"
import { Column, useTheme } from "redo-components"
import { AppHeader, HowItWorks, SignUp, SubHeader } from "./components"

export const Content = () => {
    const theme = useTheme()
    return (
        <Column
            style={{
                position: "absolute",
                padding: theme.spacing(2),
                top: 0
            }}
        >
            <AppHeader />
            <SubHeader />
            <HowItWorks />
            <SignUp />
        </Column>
    )
}
