import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import {
  SidePanel,
  SectionTab,
  ElementsSection,
  UploadSection,
  TextSection,
} from 'polotno/side-panel';
import { Shapes } from 'polotno/side-panel/elements-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';
import './studio-theme.css';

import { COLORS, BG, setPrintAspect } from './products';
import {
  setupScene,
  setColor,
  switchView,
  downloadPrintAssets,
  exportPrintSides,
} from './scene';
import { PROVIDER, fetchPrintArea } from './provider';
import { ImagesSection } from './images-section';
import { StickersSection } from './stickers-section';
import { ConfigPanel } from './config-panel';

// A t-shirt product customizer: the editor on the left, the shop's product
// column on the right. The shirt photo, the print-window overlay, and the
// print-area guide are locked layers on a single page (see scene.js); the
// customer's artwork sits between them, clipped to the printable area.
// Polotno SDK needs an API key: a trial key from https://polotno.com/cabinet
// works for trying this; production use needs a paid license.
const POLOTNO_KEY = import.meta.env.VITE_POLOTNO_KEY;

const store = createStore({ key: POLOTNO_KEY, showCredit: false });
window.store = store;

// Builds the print-ready pages for export. It is mounted in an off-screen
// <Workspace> below because Polotno only exports from a mounted store.
const printStore = createStore({ key: POLOTNO_KEY, showCredit: false });
window.printStore = printStore;

const ShapesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3l4 7H8zM5 14h6v6H5zM18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ShapesSection = {
  name: 'shapes',
  Tab: (props) => (
    <SectionTab name="Shapes" {...props}>
      <ShapesIcon />
    </SectionTab>
  ),
  Panel: ({ store }) => <Shapes store={store} />,
};

// Open the photo panel only when there is room for it beside the shirt; in a
// narrow embed the canvas would shrink to a sliver.
const DEFAULT_SECTION = window.innerWidth >= 1280 ? 'images' : '';

const SECTIONS = [
  ImagesSection,
  ElementsSection,
  UploadSection,
  TextSection,
  ShapesSection,
  StickersSection,
];

function App() {
  const [view, setView] = React.useState('front');
  const [color, setColorState] = React.useState(COLORS[0]);
  const [printArea, setPrintArea] = React.useState(null);

  React.useEffect(() => {
    // In print-on-demand mode, size the print box to the provider's real print
    // file before the scene is built. If the backend is unreachable, the demo
    // still works as a plain customizer.
    const start = async () => {
      if (PROVIDER) {
        try {
          const area = await fetchPrintArea(COLORS[0].id);
          const front = area.areas.front;
          if (front) setPrintAspect(front.width, front.height);
          setPrintArea(area);
        } catch (e) {
          console.error(`${PROVIDER.id} print area unavailable`, e);
        }
      }
      setupScene(store, COLORS[0]);
    };
    start();
  }, []);

  const handleView = (id) => {
    setView(id);
    switchView(store, id, color);
  };

  const handleColor = (c) => {
    setColorState(c);
    setColor(store, c);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: BG }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
        <PolotnoContainer>
          <SidePanelWrap>
            <SidePanel store={store} sections={SECTIONS} defaultSection={DEFAULT_SECTION} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} />
            {/* Same grey around the page and in place of the transparency
                checkerboard, so everything around the shirt is uniform. */}
            <Workspace
              store={store}
              backgroundColor={BG}
              transparencyBackgroundColor={BG}
              pageBorderColor="rgba(0,0,0,0)"
              activePageBorderColor="rgba(0,0,0,0)"
              pageControlsEnabled={false}
            />
            <ZoomButtons store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>

      <ConfigPanel
        view={view}
        onView={handleView}
        color={color}
        onColor={handleColor}
        onExport={(format) => downloadPrintAssets(store, printStore, format)}
        printArea={printArea}
        onExportSides={(sizes) => exportPrintSides(store, printStore, sizes)}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: 800,
          height: 800,
          pointerEvents: 'none',
        }}
      >
        {/* No-op key handler: shortcuts belong to the visible editor only. */}
        <Workspace store={printStore} onKeyDown={() => {}} pageControlsEnabled={false} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
