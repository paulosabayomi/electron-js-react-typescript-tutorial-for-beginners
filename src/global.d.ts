import { TPreload } from "./preload"

declare global {
    interface Window {
        electron: TPreload;
    }

    declare module '*.svg' {
        import { FC, SVGProps } from 'react'
        const content: FC<SVGProps<SVGElement>>
        export default content
    }
}