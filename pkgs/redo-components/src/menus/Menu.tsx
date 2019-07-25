import React from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Menu as MuiMenu } from "@material-ui/core"
import { MenuProps as MuiMenuProps } from "@material-ui/core/Menu"
import { MenuItem } from "./"

const stylize = makeStyles((theme: Theme) => ({}))

export type MenuProps = Partial<MuiMenuProps> & {
    Button: React.ComponentType<{
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    }>
    options?: Record<string, () => void>
    buttonText?: string
}

export const Menu = ({
    Button,
    buttonText,
    options,
    classes,
    ...rest
}: MenuProps) => {
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) =>
        setAnchor(e.currentTarget)

    const handleClose = () => setAnchor(null)

    return (
        <>
            <Button onClick={handleClick}>{buttonText}</Button>
            <MuiMenu
                anchorEl={anchor}
                open={!!anchor}
                onClose={handleClose}
                {...rest}
            >
                {Object.entries(options!).map(([name, onClick]) => (
                    <MenuItem onClick={onClick} key={name}>
                        {name}
                    </MenuItem>
                ))}
            </MuiMenu>
        </>
    )
}
