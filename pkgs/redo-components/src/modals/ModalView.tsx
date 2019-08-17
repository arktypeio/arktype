import React, { FC, cloneElement, useState } from "react"
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

export type ModalViewProps = Omit<Partial<DialogProps>, "open"> & {
    children: {
        toggle: JSX.Element
        content: JSX.Element[] | JSX.Element
    }
}

export const ModalView: FC<ModalViewProps> = ({
    children: { toggle, content },
    ...rest
}) => {
    const theme = useTheme()
    const [state, setState] = useState(false)
    const button = cloneElement(toggle, {
        onClick: () => setState(true)
    })

    return (
        <>
            {button}
            <Dialog open={state} {...rest} onClose={() => setState(false)}>
                <Card
                    style={{
                        minHeight: theme.spacing(30),
                        minWidth: theme.spacing(30),
                        padding: theme.spacing(2)
                    }}
                >
                    {content}
                </Card>
            </Dialog>
        </>
    )
}
