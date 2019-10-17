import React from "react"
import { Text, Row, Icons, IconButton, AppBar } from "@re-do/components"

export const ContactInfo = () => {
    return (
        <AppBar justify="center" kind="bottom" style={{ background: "white" }}>
            <Text color="primary">
                <i>Hearing from you would make my day!</i>
            </Text>
            <div style={{ display: "flex", padding: 16 }}>
                <Icons.email color="primary" />
                <Text color="textPrimary">david@redo.qa</Text>
            </div>
            <div>
                <a
                    href="https://www.linkedin.com/in/ssalbdivad/"
                    target="_blank"
                >
                    <IconButton Icon={Icons.linkedIn} color="primary" />
                </a>
                <a
                    href="https://www.linkedin.com/in/ssalbdivad/"
                    target="_blank"
                >
                    <IconButton Icon={Icons.gitHub} color="primary" />
                </a>
            </div>
        </AppBar>
    )
}
