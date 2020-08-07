import React from "react"
import { Dialog } from "@material-ui/core"
import { Text, Row } from "@re-do/components"
import { SignUpForm } from "./SignUpForm"

export type SignUpDialogProps = {
    open: boolean
    onClose: () => void
}

export const SignUpDialog = ({ open, onClose }: SignUpDialogProps) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                style: {
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignContent: "center"
                }
            }}
        >
            <Text align="center" variant="h4">
                We're not quite ready for production yet, but{" "}
                <a
                    href="https://github.com/re-do/redo/projects/1"
                    target="_blank"
                >
                    we're close!™️
                </a>
            </Text>
            <Row
                wrap="wrap"
                justify="center"
                align="center"
                style={{ paddingTop: 16 }}
            >
                <img style={{ width: 200 }} src="launch.svg" />
                <SignUpForm />
            </Row>
        </Dialog>
    )
}
