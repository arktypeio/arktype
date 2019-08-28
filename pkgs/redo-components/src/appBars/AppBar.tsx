import React, { FC } from "react"
import { TextInput } from "../inputs"
import { Row, RowProps } from "../layouts"
import { AppBar as MuiAppBar } from "@material-ui/core"

export type AppBarProps = RowProps

export const AppBar: FC<AppBarProps> = ({ children, ...rest }) => {
    return (
        <MuiAppBar position="fixed" style={{zIndex: 1}}>
            <Row align="center" justify="space-between" {...rest}>
                {children}
            </Row>
        </MuiAppBar>
    )
}
