import React from "react"
import { Text, Row, Icons, IconButton, AppBar } from "@re-do/components"

export const ContactInfo = () => {
    return (
        <AppBar justify="center" kind="bottom" style={{ background: "white" }}>
            <Text color="primary" style={{ paddingRight: 8 }}>
                <i>Hearing from you would make my day!</i>
            </Text>
            <Icons.email color="primary" />
            <Text color="textPrimary">david@redo.qa</Text>
            <a href="https://www.linkedin.com/in/ssalbdivad/" target="_blank">
                <IconButton Icon={Icons.linkedIn} color="primary" />
            </a>
            <a href="https://github.com/ssalbdivad" target="_blank">
                <IconButton Icon={Icons.gitHub} color="primary" />
            </a>
        </AppBar>
    )
}
