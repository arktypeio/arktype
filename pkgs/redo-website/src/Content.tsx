import "typeface-ubuntu"
import React from "react"
import { Column, HideFor, Row, AppContents } from "redo-components"
import { AppHeader, HowItWorks, SignUp, SubHeader } from "./components"

export const Content = () => {
    return (
        <AppContents>
            <HideFor smDown>
                <DesktopLayout />
            </HideFor>
            <HideFor mdUp>
                <MobileLayout />
            </HideFor>
        </AppContents>
    )
}

export const MobileLayout = () => (
    <Column>
        <AppHeader mobile={true} />
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
