import React from 'react';
import { Button } from 'polotno/primitives';

import { PRODUCT, VIEWS, COLORS, PRINT_MM_W, PRINT_MM_H, mockupImage } from './products';
import { PROVIDER } from './provider';
import { ProviderSend } from './provider-panel';

// The product column on the right: the shop-side half of the demo (price,
// side picker, garment colour, cart). Everything here is plain React; the
// editor itself lives in index.jsx.

const price = (n) => '$' + n.toFixed(2);

const PRINT_FORMATS = [
  { id: 'pdf', label: 'Download PDF' },
  { id: 'png', label: 'Download PNG' },
];

const Label = ({ children }) => (
  <div style={{ fontSize: 16, fontWeight: 600, margin: '24px 0 12px' }}>{children}</div>
);

const ViewTabs = ({ view, onView }) => (
  <div style={{ display: 'flex', background: '#f4f4f4', padding: 4, gap: 4 }}>
    {VIEWS.map((v) => (
      <Button
        key={v.id}
        variant={v.id === view ? 'default' : 'ghost'}
        onClick={() => onView(v.id)}
        style={{ flex: 1 }}
      >
        {v.label}
      </Button>
    ))}
  </div>
);

const InfoCol = ({ title, lines }) => (
  <div>
    <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
    {lines.map((l) => (
      <div key={l} style={{ fontSize: 13, color: '#525252', marginTop: 4 }}>
        {l}
      </div>
    ))}
  </div>
);

const ColorSwatch = ({ color, active, onClick }) => (
  <button
    title={color.name}
    aria-label={color.name}
    aria-pressed={active}
    onClick={onClick}
    style={{
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: color.value,
      cursor: 'pointer',
      padding: 0,
      border: 'none',
      outline: active ? '2px solid #161616' : 'none',
      outlineOffset: 2,
    }}
  />
);

export function ConfigPanel({ view, onView, color, onColor, onExport, printArea, onExportSides }) {
  const [toast, setToast] = React.useState(null);
  const [exporting, setExporting] = React.useState(null);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await onExport(format);
      flash('Print file downloaded');
    } catch (e) {
      console.error('print export failed', e);
      flash(e?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      style={{
        // Narrower when embedded in a page, so the shirt keeps room to breathe.
        width: 'clamp(300px, 30vw, 420px)',
        flexShrink: 0,
        height: '100%',
        background: '#fff',
        borderLeft: '1px solid #c6c6c6',
        overflowY: 'auto',
        padding: '24px 24px 40px',
        boxSizing: 'border-box',
        color: '#161616',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>{PRODUCT.name}</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{price(PRODUCT.priceFrom)}</div>
      </div>

      <Label>Decorations</Label>
      <ViewTabs view={view} onView={onView} />

      <div
        style={{
          marginTop: 16,
          border: '1px solid #c6c6c6',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <img
          src={mockupImage(color, view)}
          alt={`${color.name} t-shirt, ${view}`}
          style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24, rowGap: 12 }}>
          <InfoCol
            title="Print area"
            lines={
              printArea?.areas?.[view]
                ? [
                    `${printArea.areas[view].width} × ${printArea.areas[view].height} px`,
                    printArea.fromCatalog === false ? 'export size' : `from ${PROVIDER.name}'s catalog`,
                  ]
                : [`Width ${PRINT_MM_W}mm`, `Height ${PRINT_MM_H}mm`]
            }
          />
          <InfoCol title="Print method" lines={[PRODUCT.printMethod]} />
        </div>
      </div>

      <Label>Color</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {COLORS.map((c) => (
          <ColorSwatch
            key={c.id}
            color={c}
            active={c.id === color.id}
            onClick={() => onColor(c)}
          />
        ))}
      </div>

      <Button
        size="lg"
        onClick={() => flash(`Added ${color.name} ${PRODUCT.name} to cart`)}
        style={{ marginTop: 28, width: '100%' }}
      >
        {price(PRODUCT.priceFrom)} · Add to cart
      </Button>

      {PROVIDER ? (
        <>
          <Label>Print on demand</Label>
          <ProviderSend color={color} printArea={printArea} onExport={onExportSides} />
        </>
      ) : (
        <>
          <Label>Print file</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PRINT_FORMATS.map((f) => (
              <Button
                key={f.id}
                variant="outline"
                disabled={!!exporting}
                onClick={() => handleExport(f.id)}
                style={{ flex: 1 }}
              >
                {exporting === f.id ? 'Preparing…' : f.label}
              </Button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#525252', marginTop: 8 }}>
            Artwork inside the print area at 300 DPI, transparent background.
          </div>
        </>
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#161616',
            color: '#fff',
            padding: '12px 18px',
            fontSize: 14,
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
