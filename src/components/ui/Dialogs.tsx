'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Styled replacements for the browser's confirm(), prompt() and alert(),
 * which cannot be styled and look nothing like the app.
 *
 *   const { confirm, prompt, alert, dialog } = useDialogs();
 *   if (!(await confirm({ title: 'Delete page?', message: '…', action: 'Delete' }))) return;
 *   const name = await prompt({ title: 'New page', label: 'Name' });   // null when cancelled
 *   ...
 *   return <>{page}{dialog}</>;
 *
 * Each call returns a promise, like the native ones, so a call site reads the
 * same. One daisyUI modal (<dialog>) at a time; Escape or a click outside
 * cancels. The options mirror the website admin's adminConfirm: title,
 * message, action (the go button's label) and tone (a btn-* class).
 */

type Tone = 'btn-primary' | 'btn-error' | 'btn-warning' | 'btn-success';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  action?: string;
  cancel?: string;
  tone?: Tone;
}

export interface PromptOptions extends ConfirmOptions {
  label?: string;
  placeholder?: string;
  initial?: string;
  maxLength?: number;
}

type Request =
  | ({ kind: 'confirm'; resolve: (v: boolean) => void } & ConfirmOptions)
  | ({ kind: 'alert'; resolve: (v: void) => void } & ConfirmOptions)
  | ({ kind: 'prompt'; resolve: (v: string | null) => void } & PromptOptions);

export function useDialogs() {
  const [request, setRequest] = useState<(Request & { id: number }) | null>(null);
  const counter = useRef(0);

  const open = useCallback((r: Request) => setRequest({ ...r, id: ++counter.current }), []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => open({ kind: 'confirm', resolve, ...o })), [open]);
  const prompt = useCallback((o: PromptOptions) => new Promise<string | null>((resolve) => open({ kind: 'prompt', resolve, ...o })), [open]);
  const alert = useCallback((o: ConfirmOptions) => new Promise<void>((resolve) => open({ kind: 'alert', resolve, ...o })), [open]);

  const dialog = request ? <DialogView key={request.id} request={request} onDone={() => setRequest(null)} /> : null;

  return { confirm, prompt, alert, dialog };
}

function DialogView({ request, onDone }: { request: Request; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const settled = useRef(false);
  const [value, setValue] = useState(request.kind === 'prompt' ? request.initial ?? '' : '');

  useEffect(() => {
    ref.current?.showModal();
    input.current?.select();
  }, []);

  /** Answers once - whichever comes first of a button, Escape or the backdrop. */
  const finish = (ok: boolean) => {
    if (settled.current) return;
    settled.current = true;
    if (request.kind === 'confirm') request.resolve(ok);
    else if (request.kind === 'prompt') request.resolve(ok ? value.trim() : null);
    else request.resolve();
    ref.current?.close();
    onDone();
  };

  const canGo = request.kind !== 'prompt' || value.trim() !== '';
  const tone = request.tone ?? (request.kind === 'confirm' ? 'btn-error' : 'btn-primary');

  return (
    <dialog ref={ref} className="modal" onClose={() => finish(false)}>
      <form
        method="dialog"
        className="modal-box space-y-4"
        onSubmit={(e) => { e.preventDefault(); if (canGo) finish(true); }}
      >
        <h3 className="font-semibold text-lg">{request.title}</h3>
        {request.message && <div className="text-sm text-base-content/70 whitespace-pre-line">{request.message}</div>}
        {request.kind === 'prompt' && (
          <label className="block">
            {request.label && <span className="label-text text-xs font-medium mb-1 block">{request.label}</span>}
            <input
              ref={input}
              className="input input-bordered w-full"
              value={value}
              maxLength={request.maxLength}
              placeholder={request.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        )}
        <div className="modal-action mt-2">
          {request.kind !== 'alert' && (
            <button type="button" className="btn btn-ghost" onClick={() => finish(false)}>{request.cancel ?? 'Cancel'}</button>
          )}
          <button type="submit" className={`btn ${tone}`} disabled={!canGo} autoFocus={request.kind !== 'prompt'}>
            {request.action ?? (request.kind === 'alert' ? 'OK' : request.kind === 'prompt' ? 'Save' : 'Confirm')}
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={() => finish(false)} aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
