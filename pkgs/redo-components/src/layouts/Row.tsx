import React from "react"
import { RowOrColumn, RowOrColumnProps } from "./RowOrColumn"
import { createStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"

const styles = (theme: Theme) => createStyles({})

export type RowProps = Omit<RowOrColumnProps, "direction">

export const Row = ({ classes, ...rest }: RowProps) => {
    return <RowOrColumn direction="row" {...rest} />
}
