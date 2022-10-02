
import * as B from "@blueprintjs/core";
import styled from "styled-components";

const Sidebar = styled.div`
    position: fixed;
    left: 0;
    width: 256px;
    height: 100%;
`

export interface WithSidebarProps {
    sidebar: React.ReactNode
    children: React.ReactNode
}

export function WithSidebar(p: WithSidebarProps): React.ReactElement {
    return <>
        <Sidebar>
            <B.Menu>
               {p.sidebar}
            </B.Menu>
        </Sidebar>
        {p.children}
    </>
}