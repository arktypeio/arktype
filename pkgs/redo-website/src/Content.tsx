import "typeface-ubuntu"
import { Grid } from "@material-ui/core"
import React, { useEffect, useRef, useState, FC } from "react"
import { HideFor, Row, AppContents, Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp } from "./components"
import { AppStateContext } from "./AppStateContext"

export const Content: FC = () => {
    const ref = useRef<HTMLDivElement>(null)
    const [contentHeight, setContentHeight] = useState()
    useEffect(() => {
        ref.current && setContentHeight(ref.current.clientHeight)
    })
    return (
        <AppStateContext.Provider value={{ contentHeight }}>
            <AppContents>
                <Grid ref={ref}>
                    {/* <HideFor smDown>
                        <DesktopLayout />
                    </HideFor>
                    <HideFor mdUp> */}
                    <MobileLayout />
                    {/* </HideFor> */}
                </Grid>
            </AppContents>
        </AppStateContext.Provider>
    )
}

export const MobileLayout: FC = () => (
    <Column align="center">
        <AppHeader mobile={true} />
        <Column style={{ maxWidth: 500 }}>
            <HowItWorks />
            <SignUp />
        </Column>
    </Column>
)

export const DesktopLayout: FC = () => (
    <>
        <Row>
            <AppHeader />
            <HowItWorks />
        </Row>
        <Row>
            <SignUp />
        </Row>
    </>
)
