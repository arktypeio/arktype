import "typeface-ubuntu"
import React from "react"
import { Column, useTheme, HideFor, Row } from "redo-components"
import { AppHeader, HowItWorks, SignUp, SubHeader } from "./components"

export const Content = () => {
    const theme = useTheme()
    return (
        <div
            style={{
                position: "absolute",
                padding: theme.spacing(2),
                top: 0
            }}
        >
            <HideFor smDown>
                <DesktopLayout />
            </HideFor>
            <HideFor mdUp>
                <MobileLayout />
            </HideFor>
        </div>
    )
}

export const MobileLayout = () => (
    <Column align="center">
        <AppHeader />
        <SubHeader />
        <HowItWorks />
        <SignUp />
    </Column>
)

export const DesktopLayout = () => (
    <Column>
        <Row height={350}>
            <AppHeader />
            <SubHeader />
            <HowItWorks />
        </Row>
        <Row>
            <SignUp />
        </Row>
    </Column>
)
