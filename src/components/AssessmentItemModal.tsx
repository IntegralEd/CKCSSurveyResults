'use client';

/**
 * AssessmentItemModal
 *
 * Detail panel for a single assessment item. Triggered by the ⓘ button
 * next to item numbers in both chart and table views.
 *
 * Shows:
 *   - Item label / order + type badge
 *   - Full prompt (Prompt richText field, rendered as pre-wrap plain text)
 *   - MC options A–F with correct answers highlighted (when Item_Type = MC)
 *   - Correct response text (for open-response items)
 *   - Points possible
 *   - Standards code
 *   - Rubric reference (when present)
 */

import { useEffect, useCallback } from 'react';
import type { AssessmentItemDetail } from '@/lib/assessmentTypes';

interface Props {
  item: AssessmentItemDetail;
  itemOrder: number;
  assessmentId: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    'Multiple Choice': 'bg-blue-50 text-blue-700 border-blue-200',
    'MC':              'bg-blue-50 text-blue-700 border-blue-200',
    'Open Response':   'bg-amber-50 text-amber-700 border-amber-200',
    'OR':              'bg-amber-50 text-amber-700 border-amber-200',
    'Short Answer':    'bg-amber-50 text-amber-700 border-amber-200',
    'Constructed':     'bg-purple-50 text-purple-700 border-purple-200',
  };
  const cls = colors[type] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}>
      {type}
    </span>
  );
}

const MC_TYPES = new Set(['Multiple Choice', 'MC', 'multiple choice', 'mc']);
const isMC = (itemType: string) => MC_TYPES.has(itemType) || Object.keys({}).length === 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentItemModal({ item, itemOrder, assessmentId, onClose }: Props) {
  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const hasOptions = Object.keys(item.options).length > 0;
  const hasCorrectMc = item.correctMcLetters.length > 0 || item.correctMcFlat;
  const showMcSection = hasOptions || hasCorrectMc;
  const showOpenResponse = !showMcSection && item.correctResponseText;

  const heading = item.displayLabel || item.itemLabel || `Item ${itemOrder}`;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Item detail: ${heading}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-mono">#{itemOrder}</span>
              <span className="text-base font-semibold text-[#17345B]">{heading}</span>
              <TypeBadge type={item.itemType} />
              {item.pointsPossible !== null && (
                <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">
                  {item.pointsPossible} {item.pointsPossible === 1 ? 'pt' : 'pts'}
                </span>
              )}
            </div>
            {item.standardsCode && (
              <div className="text-xs text-[#5E738C]">
                Standard: <span className="font-medium">{item.standardsCode}</span>
              </div>
            )}
            <div className="text-xs text-slate-400">{assessmentId}</div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Full prompt */}
          {item.prompt && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Item Prompt
              </div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                {item.prompt}
              </div>
            </section>
          )}

          {/* MC options */}
          {showMcSection && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Answer Choices
              </div>
              <div className="space-y-1.5">
                {hasOptions ? (
                  Object.entries(item.options).map(([letter, text]) => {
                    const isCorrect = item.correctMcLetters.includes(letter);
                    return (
                      <div
                        key={letter}
                        className={[
                          'flex items-start gap-3 px-3 py-2 rounded-lg text-sm',
                          isCorrect
                            ? 'bg-green-50 border border-green-200 text-green-800 font-medium'
                            : 'bg-white border border-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        <span className={[
                          'w-5 h-5 shrink-0 rounded-full text-xs font-bold flex items-center justify-center mt-px',
                          isCorrect ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600',
                        ].join(' ')}>
                          {letter}
                        </span>
                        <span>{text}</span>
                        {isCorrect && (
                          <span className="ml-auto shrink-0 text-green-600 text-xs font-semibold">✓ Correct</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Options not loaded — just show the correct answer text
                  <div className="text-sm text-slate-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="font-semibold text-green-700">Correct: </span>
                    {item.correctMcFlat || item.correctMcLetters.join(', ')}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Open response correct answer */}
          {showOpenResponse && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Correct Response
              </div>
              <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3 whitespace-pre-wrap">
                {item.correctResponseText}
              </div>
            </section>
          )}

          {/* Rubric reference */}
          {item.rubricReference && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Scoring Rubric
              </div>
              <div className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 whitespace-pre-wrap leading-relaxed">
                {item.rubricReference}
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#17345B] text-white text-sm font-medium hover:bg-[#255694] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────────

/**
 * Small ⓘ icon button rendered next to the item number.
 * Use in both chart and table views.
 */
export function ItemInfoButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label ?? 'View item detail'}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[#5E738C] hover:text-[#17345B] hover:bg-[#17345B]/10 transition-colors shrink-0"
      aria-label={label ?? 'View item detail'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="8"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
      </svg>
    </button>
  );
}
