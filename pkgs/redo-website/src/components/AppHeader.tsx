import React, { FC } from "react"
import { Text, Card } from "redo-components"
import { AnimatedLogo } from "./AnimatedLogo"
import Typist from "react-typist"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"

const stylize = makeStyles<Theme>(theme => ({
    header: {
        height: 250
    }
}))

export const AppHeader: FC = () => {
    const { header } = stylize()
    return (
        <div className={header}>
            <AnimatedLogo />
            <Text variant="h4" color="primary" align="center">
                Free automated testing
            </Text>
            <Typist startDelay={400} cursor={{ show: false }}>
                <Text variant="h4" color="secondary" align="center">
                    that builds itself.
                </Text>
            </Typist>
        </div>
    )
}
