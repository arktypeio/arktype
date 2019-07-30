import "typeface-ubuntu"
import React from "react"
import { makeStyles } from "@material-ui/styles"
import { Typography, TextField, Button, Theme } from "@material-ui/core"
import { Column, Row, InfoText } from "redo-components"
import { HeaderCard } from "./components"

const stylize = makeStyles<Theme>(theme => ({
    content: {
        position: "absolute",
        padding: theme.spacing(5),
        top: 0,
        height: "100vh",
        width: "100vw"
    }
}))

export const Content = () => {
    const { content } = stylize()
    return (
        <Column className={content} align="center">
            <HeaderCard>Free automated testing that builds itself.</HeaderCard>
            <InfoText>How it works:</InfoText>
            <Row>
                <Typography>1.</Typography>
                <Typography>2.</Typography>
                <Typography>3.</Typography>
            </Row>
            <InfoText>Sign up to be notified on release!</InfoText>
            <TextField
                type="text"
                name="email"
                placeholder="email"
                variant="outlined"
                color="secondary"
            />
            <Button variant="contained" color="primary">
                Sign up!
            </Button>
        </Column>
    )
}
