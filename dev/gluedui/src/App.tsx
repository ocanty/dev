import './App.css';

import { Page } from "./base/Page";

import * as Apps from "./apps/manifest";

function App() {
  return (
    <Page>
      <Apps.Netcop.Index/>
    </Page>
  );
}

export default App;
