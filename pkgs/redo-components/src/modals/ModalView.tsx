import React, { FC, cloneElement } from "react"
import { Button } from "../buttons"
import { Card } from "../cards"
import { Text } from "../text"
import { Form, FormText, FormSubmit, createValidator } from "../forms"
import { useTheme } from "../styles"
import { Row, Column } from "../layouts"
import { Dialog } from "@material-ui/core"
import { DialogProps } from "@material-ui/core/Dialog"
import { Fields } from "../forms"
import { DisplayAs } from "../displayAs"

export type ModalViewProps = DialogProps & {}

export const ModalView: FC<ModalViewProps> = ({ children, ...rest }) => {
    const theme = useTheme()
    return (
        <Dialog {...rest}>
            <Card
                style={{
                    minHeight: theme.spacing(30),
                    minWidth: theme.spacing(30),
                    padding: theme.spacing(2)
                }}
            >
                {children}
            </Card>
        </Dialog>
    )
}
