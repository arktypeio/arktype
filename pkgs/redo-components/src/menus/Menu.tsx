import React, { FC } from "react"
import { Menu as MuiMenu } from "@material-ui/core"
import { MenuProps as MuiMenuProps } from "@material-ui/core/Menu"
import { MenuItem } from "."

export type MenuProps = Partial<MuiMenuProps> & {
    Button: React.ComponentType<{
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    }>
    options?: Record<string, () => void>
    buttonText?: string
}

export const Menu: FC<MenuProps> = ({
    Button,
    buttonText,
    options,
    classes,
    ...rest
}) => {
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
