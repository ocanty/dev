import React from "react"

import * as B from "@blueprintjs/core"
import styled from "styled-components"

export interface PageProps {
    children?: React.ReactNode
}

const PageContainer = styled.div`
    background-color: rgb(33,33,33);
    top: 0;
    left: 0;
    position: fixed;
    width: 100vw;
    overflow-x: hidden;
    min-height: 100vh;
`

export function Page(p: PageProps): React.ReactElement {
    return (<PageContainer className="bp4-dark">
        <B.Navbar fixedToTop>
            <B.NavbarGroup>
                <B.NavbarHeading>
                    <B.H3 color={"rgb(0,0,0)"}>
                        @dev/glue
                    </B.H3>
                </B.NavbarHeading>
                <B.NavbarDivider />
                <B.Button className={B.Classes.MINIMAL} icon="home" text="Home" />
            </B.NavbarGroup>
        </B.Navbar>
        <div style={{marginTop: "50px"}}>
            {p.children}
        </div>
    </PageContainer>)
}