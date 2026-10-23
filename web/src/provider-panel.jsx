import React from 'react';
import {
  Button,
  buttonVariants,
  Spinner,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'polotno/primitives';

import { PROVIDER, sendDesign } from './provider';

// The print step in print-on-demand mode: export the artwork, send it to the
// provider through the demo backend, and show what came back.

const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const styles = {
  hint: { fontSize: 13, color: '#525252', marginTop: 8 },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    marginTop: 10,
    padding: '10px 12px',
    background: '#f4f4f4',
  },
  button: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { fontSize: 13, color: '#b42318', marginTop: 8 },
  dialog: {
    maxWidth: 820,
    width: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
  },
  mockups: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  mockup: {
    width: 220,
    height: 220,
    objectFit: 'contain',
    background: '#f4f4f4',
    border: '1px solid #e0e0e0',
  },
  caption: { fontSize: 12, color: '#525252', marginTop: 4, textTransform: 'capitalize' },
  rendering: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 12,
    color: '#525252',
  },
  label: { fontSize: 13, fontWeight: 600, marginTop: 20 },
  endpoint: { fontFamily: mono, fontSize: 12, margin: '6px 0' },
  code: {
    fontFamily: mono,
    fontSize: 12,
    lineHeight: 1.5,
    margin: 0,
    padding: 12,
    background: '#f4f4f4',
    overflowX: 'auto',
    whiteSpace: 'pre',
    maxHeight: 280,
  },
};

// Data URLs are megabytes long; show what they are instead of the bytes.
const shorten = (value) =>
  JSON.stringify(
    value,
    (key, v) => (typeof v === 'string' && v.length > 120 ? `${v.slice(0, 40)}…` : v),
    2
  );

// Some providers render on request: until the image is ready its URL answers
// with an error, which can last a minute or more. Retry instead of showing an
// empty box.
const Mockup = ({ mockup }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const gaveUp = attempt >= 40;
  // A fragment is never sent to the server, so the URL stays the same while
  // the browser treats each attempt as a new image.
  const src = attempt ? `${mockup.url}#retry=${attempt}` : mockup.url;
  return (
    <div style={{ position: 'relative' }}>
      <img
        key={attempt}
        src={src}
        alt={`${PROVIDER.name} mockup, ${mockup.side}`}
        style={styles.mockup}
        onLoad={() => setLoaded(true)}
        onError={() => !gaveUp && setTimeout(() => setAttempt((a) => a + 1), 3000)}
      />
      {!loaded && (
        <div role="status" style={styles.rendering}>
          {gaveUp ? (
            <a href={mockup.url} target="_blank" rel="noreferrer">
              Still rendering, open it later
            </a>
          ) : (
            <>
              <Spinner />
              {PROVIDER.name} is rendering…
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Result = ({ result, onClose }) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent style={styles.dialog}>
      <DialogHeader>
        <DialogTitle>Back from {PROVIDER.name}</DialogTitle>
        <DialogDescription>
          {result.productUrl
            ? `${PROVIDER.name} created this product from the front design this editor just exported, through its API. Nothing was ordered.`
            : `These mockups were rendered by ${PROVIDER.name} from the print files this editor just exported, through its API. Nothing was ordered.`}
        </DialogDescription>
      </DialogHeader>

      {result.productUrl && (
        <a
          href={result.productUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'default' })}
          style={{ marginTop: 4, alignSelf: 'flex-start' }}
        >
          Open the product page on {PROVIDER.name} ↗
        </a>
      )}

      <div style={styles.mockups}>
        {result.mockups.map((m) => (
          <div key={m.url}>
            <Mockup mockup={m} />
            <div style={styles.caption}>{m.side}</div>
          </div>
        ))}
      </div>

      {result.requests.map((r) => (
        <div key={r.endpoint}>
          <div style={styles.label}>{r.title}</div>
          <p style={styles.endpoint}>{r.endpoint}</p>
          <pre style={styles.code}>{shorten(r.body)}</pre>
        </div>
      ))}
    </DialogContent>
  </Dialog>
);

export function ProviderSend({ color, printArea, onExport }) {
  // null when idle, otherwise the step in progress, shown under the button.
  const [step, setStep] = React.useState(null);
  const busy = step !== null;
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState(null);

  const send = async () => {
    setStep('Exporting the print files…');
    setError(null);
    try {
      const files = await onExport(printArea.areas);
      // Printful's mockup generator is a queue; Printify answers in seconds.
      setStep(
        {
          teemill: 'Teemill is creating the product…',
        }[PROVIDER.id]
      );
      setResult(await sendDesign(files, color.id));
    } catch (e) {
      console.error(`${PROVIDER.id} send failed`, e);
      setError(e?.message || 'Something went wrong');
    } finally {
      setStep(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        disabled={!printArea}
        aria-busy={busy}
        onClick={busy ? undefined : send}
        style={{ ...styles.button, cursor: busy ? 'progress' : undefined }}
      >
        {busy ? `Sending to ${PROVIDER.name}…` : `Send to ${PROVIDER.name}`}
      </Button>
      {busy ? (
        <div role="status" style={styles.progress}>
          <Spinner />
          {step}
        </div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <div style={styles.hint}>
          {PROVIDER.send === 'product'
            ? `Exports the front design and gets back a real ${PROVIDER.name} product page for it. Nothing is ordered.`
            : `Exports the artwork at ${PROVIDER.name}'s print size and gets ${PROVIDER.name}'s own mockups back. Nothing is ordered.`}
        </div>
      )}
      {result && <Result result={result} onClose={() => setResult(null)} />}
    </>
  );
}
