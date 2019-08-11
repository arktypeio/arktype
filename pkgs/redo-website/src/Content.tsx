import "typeface-ubuntu"
import React, { FC } from "react"
import { AppContents, Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp, SubHeader } from "./components"

export const Content: FC = () => {
    return (
        <AppContents>
            <Column align="center" style={{ overflow: "hidden" }}>
                <AppHeader mobile={true} />
                <Column spacing={4} style={{ maxWidth: 500, padding: 16 }}>
                    <SubHeader />
                    <HowItWorks />
                    <SignUp />
                </Column>
            </Column>
        </AppContents>
    )
}
