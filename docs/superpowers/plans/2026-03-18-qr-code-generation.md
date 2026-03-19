# QR-Code-Generierung für Fragen-Formular – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bei Fragen vom Typ `qr_code` im Formular einen QR-Code aus der Antwort generieren und als PNG herunterladen können.

**Architecture:** Neue Client-Component `QuestionQRCode` mit `qrcode.react` (QRCodeCanvas). Vorschau 200×200 px, Download 400×400 px. Slugify-Hilfsfunktion für benutzerfreundliche Dateinamen. Einbindung in `QuestionForm` analog zu `QuestionImage` bei `picture`.

**Tech Stack:** React, Next.js, qrcode.react, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-18-qr-code-generation-design.md`

---

## Prerequisites & Gates

**Pre-existing tsc failure:** Das Repo kann aktuell wegen `.next/dev/types/validator.ts` fehlschlagen (Referenz auf nicht existierende `app/(protected)/rallyes/[id]/qr-codes/page.tsx`). Vor der Implementierung:

- `rm -rf .next && npm run build` ausführen, um den Next.js-Cache zu regenerieren, ODER
- Die fehlende Route ggf. anlegen / Referenz entfernen, bis `npx tsc --noEmit` grün ist.

**AGENTS.md-Workflow:** Nach jedem Schritt `npm run lint`, `npx tsc --noEmit`, `npm test` ausführen. Nach jedem Schritt anhalten und auf dein „OK“ warten, bevor committet oder fortgefahren wird.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/slug.ts` | `slugify(text: string, maxLength?: number): string` – Fragetext zu Dateinamen-Slug |
| `lib/slug.test.ts` | Unit tests für slugify |
| `components/questions/id/QuestionQRCode.tsx` | Client Component: QR-Vorschau, Generate-Button, PNG-Download, Error Correction M, Error Boundary für Kapazitätsfehler |
| `components/questions/id/QuestionQRCode.test.tsx` | Component tests |
| `components/questions/id/QuestionForm.tsx` | Einbindung von QuestionQRCode bei `type === 'qr_code'` |

---

## Task 1: slugify-Hilfsfunktion

**Files:**
- Create: `lib/slug.ts`
- Create: `lib/slug.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('converts German text to lowercase slug', () => {
    expect(slugify('Campus Bibliothek Eingang')).toBe('campus-bibliothek-eingang');
  });

  it('replaces umlauts with ASCII equivalents', () => {
    expect(slugify('Größe und Tür')).toBe('groesse-und-tuer');
  });

  it('truncates to maxLength characters', () => {
    expect(slugify('A'.repeat(100), 50)).toHaveLength(50);
  });

  it('returns fallback for empty or whitespace-only input', () => {
    expect(slugify('')).toBe('qr-code');
    expect(slugify('   ')).toBe('qr-code');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/slug.test.ts`
Expected: FAIL (slugify not defined / module not found)

- [ ] **Step 3: Write minimal implementation**

Create `lib/slug.ts`:

```ts
/**
 * Converts text to a URL-safe slug for filenames.
 * Replaces umlauts (ä→ae, ö→oe, ü→ue, ß→ss), lowercases, replaces non-alphanumeric with hyphens.
 * @param text - Input text (e.g. question content)
 * @param maxLength - Max length of result (default 50)
 * @returns Slug string, or 'qr-code' if result would be empty
 */
export function slugify(text: string, maxLength = 50): string {
  if (!text?.trim()) return 'qr-code';
  const normalized = text
    .trim()
    .slice(0, maxLength * 2) // allow extra before truncation
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const result = normalized.slice(0, maxLength).replace(/-$/, '');
  return result || 'qr-code';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/slug.test.ts`
Expected: PASS (adjust implementation if umlaut handling differs – e.g. `ü` in "Bibliothek" → "bibliothek")

- [ ] **Step 5: Run lint, tsc, and tests**

Run: `npm run lint`, `npx tsc --noEmit`, `npm test`
Expected: All pass (ggf. Prerequisites prüfen, siehe oben)

- [ ] **Step 6: Stop for OK** — Warte auf dein „OK“ vor dem Commit.

- [ ] **Step 7: Commit**

```bash
git add lib/slug.ts lib/slug.test.ts
git commit -m "feat: add slugify utility for QR code filenames"
```

---

## Task 2: QuestionQRCode Component

**Files:**
- Create: `components/questions/id/QuestionQRCode.tsx`
- Create: `components/questions/id/QuestionQRCode.test.tsx`

- [ ] **Step 1: Install qrcode.react**

Run: `npm install qrcode.react`

- [ ] **Step 2: Write failing component test**

Create `components/questions/id/QuestionQRCode.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuestionQRCode from './QuestionQRCode';

describe('QuestionQRCode', () => {
  it('shows generate button disabled when answerText is empty', () => {
    render(<QuestionQRCode answerText="" />);
    const btn = screen.getByRole('button', { name: /qr-code generieren/i });
    expect(btn).toBeDisabled();
  });

  it('shows generate button enabled when answerText has content', () => {
    render(<QuestionQRCode answerText="https://example.com" />);
    const btn = screen.getByRole('button', { name: /qr-code generieren/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows preview and download button after generate click', async () => {
    render(<QuestionQRCode answerText="test" />);
    fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
    expect(await screen.findByRole('button', { name: /png herunterladen/i })).toBeInTheDocument();
  });

  it('resets preview when answerText changes', async () => {
    const { rerender } = render(<QuestionQRCode answerText="test" />);
    fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
    expect(await screen.findByRole('button', { name: /png herunterladen/i })).toBeInTheDocument();
    rerender(<QuestionQRCode answerText="other" />);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /png herunterladen/i })).not.toBeInTheDocument();
    });
  });
});
```

Note: The download test may need simplification (e.g. only check that the button triggers without throwing). Adjust if DOM mocking is complex.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- components/questions/id/QuestionQRCode.test.tsx`
Expected: FAIL (component not found / module not found)

- [ ] **Step 4: Write QuestionQRCode component**

Create `components/questions/id/QuestionQRCode.tsx`:

- Zwei QRCodeCanvas: einer sichtbar (previewSize) für die Vorschau, einer versteckt (downloadSize) für den PNG-Download
- `downloadCanvasRef` zeigt auf den versteckten Container mit dem downloadSize-Canvas
- `useEffect` setzt `showPreview` auf false, wenn sich `answerText` ändert
- `handleDownload` liest den Canvas aus dem versteckten div via `downloadCanvasRef.current?.querySelector('canvas')` und ruft `toDataURL('image/png')` auf
- **Error Boundary:** Das eigentliche Risiko (Kapazitätsüberschreitung) tritt beim Mount von QRCodeCanvas auf – React wirft dann während des Renders, nicht in handleGenerate. Ein Error Boundary um die QRCodeCanvas-Elemente fängt das ab, ruft `onError` auf und zeigt „Text zu lang für QR-Code“. `key={trimmed}` sorgt dafür, dass der Boundary bei Textänderung neu gemountet wird.

Vollständiger Code:

```tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { slugify } from '@/lib/slug';

const QR_CAPACITY_ERROR = 'Text zu lang für QR-Code';

class QRCodeErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface QuestionQRCodeProps {
  answerText: string;
  questionContent?: string;
  questionId?: number;
  previewSize?: number;
  downloadSize?: number;
}

const PREVIEW_SIZE = 200;
const DOWNLOAD_SIZE = 400;

export default function QuestionQRCode({
  answerText,
  questionContent,
  questionId,
  previewSize = PREVIEW_SIZE,
  downloadSize = DOWNLOAD_SIZE,
}: QuestionQRCodeProps) {
  const downloadCanvasRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = answerText?.trim() ?? '';
  const canGenerate = trimmed.length > 0;

  useEffect(() => {
    setShowPreview(false);
    setError(null);
  }, [answerText]);

  const getFilename = () => {
    const slug = questionContent?.trim()
      ? slugify(questionContent)
      : questionId
        ? `qr-code-${questionId}`
        : `qr-code-${Date.now()}`;
    return `${slug}.png`;
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    setError(null);
    setShowPreview(true);
  };

  const handleQRError = () => {
    setShowPreview(false);
    setError(QR_CAPACITY_ERROR);
  };

  const handleDownload = () => {
    if (!trimmed || !showPreview) return;
    setError(null);
    try {
      const container = downloadCanvasRef.current;
      const canvas = container?.querySelector('canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = getFilename();
      link.click();
    } catch {
      setError('Text zu lang für QR-Code');
    }
  };

  return (
    <div className="space-y-3">
      <Label>QR-Code</Label>
      <p className="text-xs text-muted-foreground">
        QR-Code aus der Antwort generieren und als PNG herunterladen.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        QR-Code generieren
      </Button>
      {showPreview && (
        <QRCodeErrorBoundary
          key={trimmed}
          onError={handleQRError}
          fallback={<p className="text-sm text-destructive">{QR_CAPACITY_ERROR}</p>}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div style={{ width: previewSize, height: previewSize }}>
                <QRCodeCanvas value={trimmed} size={previewSize} level="M" />
              </div>
              <div
                ref={downloadCanvasRef}
                style={{
                  position: 'absolute',
                  left: -9999,
                  width: downloadSize,
                  height: downloadSize,
                }}
              >
                <QRCodeCanvas value={trimmed} size={downloadSize} level="M" />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              PNG herunterladen
            </Button>
          </div>
        </QRCodeErrorBoundary>
      )}
    </div>
  );
}
```

`downloadCanvasRef` zeigt auf den versteckten div mit dem downloadSize-Canvas; `querySelector('canvas')` liefert dann das 400px-Canvas für den PNG-Download.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- components/questions/id/QuestionQRCode.test.tsx`
Expected: PASS (adjust tests if needed)

- [ ] **Step 6: Run lint, tsc, and tests**

Run: `npm run lint`, `npx tsc --noEmit`, `npm test`
Expected: All pass (Prerequisites prüfen falls tsc fehlschlägt)

- [ ] **Step 7: Stop for OK** — Warte auf dein „OK“ vor dem Commit.

- [ ] **Step 8: Commit**

```bash
git add components/questions/id/QuestionQRCode.tsx components/questions/id/QuestionQRCode.test.tsx package.json package-lock.json
git commit -m "feat: add QuestionQRCode component with PNG download"
```

---

## Task 3: Integrate QuestionQRCode into QuestionForm

**Files:**
- Modify: `components/questions/id/QuestionForm.tsx`
- Modify: `components/questions/id/QuestionForm.test.tsx` (if needed)

- [ ] **Step 1: Add isQRCode and import QuestionQRCode**

In `QuestionForm.tsx` (neben `isPicture`), add:
```ts
const isQRCode = formData.type === 'qr_code';
```

Add import:
```ts
import QuestionQRCode from './QuestionQRCode';
```

- [ ] **Step 2: Add QuestionQRCode block**

Place it directly under the answer block (inside the `showAnswers` section, at the end, before the closing `</div>` of the answers card). Add after the answers list and before `{isMultipleChoice && (...)` or at the end of the answers block:

```tsx
{isQRCode && (
  <div className="mt-4">
    <QuestionQRCode
      answerText={formData.answers?.[0]?.text ?? ''}
      questionContent={formData.content}
      questionId={initialData?.id}
      previewSize={200}
      downloadSize={400}
    />
  </div>
)}
```

Exact location: After `{errors.answers && (...)}`, inside the same parent `<div className="space-y-4 ...">` that wraps the answers. (Orient by structure, not line numbers.) So the structure is:
- Label
- Multiple choice OR single answer inputs
- Add-answer button (if multiple choice)
- errors.answers
- **NEW: isQRCode && QuestionQRCode**

(Reset bei Antwortänderung ist bereits in QuestionQRCode via useEffect umgesetzt.)

- [ ] **Step 3: Run dev server and manually test**

Run: `npm run dev`
Navigate to questions, create/edit a qr_code question. Enter answer, click "QR-Code generieren", verify preview and PNG download.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All pass

- [ ] **Step 5: Run lint, tsc, and tests**

Run: `npm run lint`, `npx tsc --noEmit`, `npm test`
Expected: All pass

- [ ] **Step 6: Stop for OK** — Warte auf dein „OK“ vor dem Commit.

- [ ] **Step 7: Commit**

```bash
git add components/questions/id/QuestionForm.tsx components/questions/id/QuestionForm.test.tsx
git commit -m "feat: integrate QuestionQRCode into QuestionForm for qr_code type"
```

(Falls QuestionForm.test.tsx für die Integration angepasst wurde, muss die Datei mit im Commit sein.)

---

## Verification Checklist

- [ ] Prerequisites: `npx tsc --noEmit` grün (ggf. `rm -rf .next && npm run build`)
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] Manual: Create qr_code question, enter answer, generate QR, download PNG (400×400)
- [ ] Manual: Change answer text, verify preview resets
- [ ] Manual: Filename derived from question content when available
