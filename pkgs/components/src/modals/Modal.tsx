import React, { cloneElement, useState } from "react"
import { Card } from "../cards"
import { useTheme } from "../styles"
import { Dialog } from "@material-ui/core"
import { DialogProps } from "@material-ui/core/Dialog"

export type ModalProps = Omit<Partial<DialogProps>, "open"> & {
    toggle: JSX.Element
    content: JSX.Element
}

export const Modal = ({ toggle, content, ...rest }: ModalProps) => {
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
