import React, { FC } from "react"
import Grid, { GridProps, GridItemsAlignment } from "@material-ui/core/Grid"

export type ContainerProps = GridProps & {
    align?: GridItemsAlignment
}

export const Container: FC<ContainerProps> = ({ align, ...rest }) => {
    return <Grid container item alignItems={align} wrap="nowrap" {...rest} />
}
