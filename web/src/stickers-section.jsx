import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { PRINT } from './products';

// A light, free sticker set sourced from OpenMoji (CC BY-SA 4.0) over the
// jsDelivr CDN. No API key needed.
const OPENMOJI =
  'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0.0/color/svg';

const CODES = [
  '2764', '2B50', '1F525', '1F600', '1F60E', '1F44D',
  '1F308', '1F984', '1F436', '1F431', '1F355', '1F354',
  '26A1', '1F389', '1F680', '1F31F', '1F496', '1F33B',
  '1F47D', '1F916', '1F3B8', '1F4AF', '1F451', '1F40D',
  '1F981', '1F438', '1F995', '1F9E1', '1F319', '2615',
];

const url = (code) => `${OPENMOJI}/${code}.svg`;

const StickersPanel = observer(({ store }) => {
  const addSticker = async (code) => {
    const size = Math.round(PRINT.width * 0.45);
    store.activePage.addElement({
      type: 'svg',
      src: url(code),
      width: size,
      height: size,
      x: PRINT.x + (PRINT.width - size) / 2,
      y: PRINT.y + (PRINT.height - size) / 2,
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontSize: 12, color: '#8a8d93', margin: '4px 0 10px' }}>
        Click a sticker to add it to your design.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          overflowY: 'auto',
        }}
      >
        {CODES.map((code) => (
          <button
            key={code}
            onClick={() => addSticker(code)}
            style={{
              aspectRatio: '1 / 1',
              border: '1px solid #e6e7ea',
              borderRadius: 0,
              background: '#fff',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={url(code)}
              alt={code}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
});

const StickersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9zM9 11a.5.5 0 1 0 0-.01M15 11a.5.5 0 1 0 0-.01M9 15c1 1 5 1 6 0"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const StickersSection = {
  name: 'stickers',
  Tab: (props) => (
    <SectionTab name="Stickers" {...props}>
      <StickersIcon />
    </SectionTab>
  ),
  Panel: StickersPanel,
};
