import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

function parseDisplay(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatDisplay(n: number): string {
  const s = n.toString();
  if (s.includes('e')) return s;
  const [int, dec] = s.split('.');
  const trimmed = dec ? `${int}.${dec.replace(/0+$/, '')}`.replace(/\.$/, '') : int;
  return trimmed;
}

function CalculatorApp(_context: AppContext): AppInstance {
  function CalculatorUI() {
    const [display, setDisplay] = useState('0');
    const [accumulator, setAccumulator] = useState<number | null>(null);
    const [pendingOp, setPendingOp] = useState<string | null>(null);
    const [freshResult, setFreshResult] = useState(false);

    const applyOp = useCallback((op: string, a: number, b: number): number => {
      switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? 0 : a / b;
        default: return b;
      }
    }, []);

    const onDigit = useCallback((d: string) => {
      setDisplay((prev) => {
        if (freshResult) return d === '.' ? '0.' : d;
        if (d === '.') return prev.includes('.') ? prev : prev + '.';
        if (prev === '0' && d !== '.') return d;
        return prev + d;
      });
      setFreshResult(false);
    }, [freshResult]);

    const onOperator = useCallback((op: string) => {
      const current = parseDisplay(display);
      if (accumulator !== null && pendingOp !== null) {
        const result = applyOp(pendingOp, accumulator, current);
        setDisplay(formatDisplay(result));
        setAccumulator(result);
      } else {
        setAccumulator(current);
      }
      setPendingOp(op);
      setFreshResult(true);
    }, [display, accumulator, pendingOp, applyOp]);

    const onEquals = useCallback(() => {
      const current = parseDisplay(display);
      if (accumulator !== null && pendingOp !== null) {
        const result = applyOp(pendingOp, accumulator, current);
        setDisplay(formatDisplay(result));
        setAccumulator(null);
        setPendingOp(null);
      }
      setFreshResult(true);
    }, [display, accumulator, pendingOp, applyOp]);

    const onClear = useCallback(() => {
      setDisplay('0');
      setAccumulator(null);
      setPendingOp(null);
      setFreshResult(false);
    }, []);

    const buttons: { label: string; onClick: () => void; class?: string }[] = [
      { label: 'C', onClick: onClear, class: 'calc-fn' },
      { label: '÷', onClick: () => onOperator('÷'), class: 'calc-op' },
      { label: '×', onClick: () => onOperator('×'), class: 'calc-op' },
      { label: '−', onClick: () => onOperator('−'), class: 'calc-op' },
      { label: '7', onClick: () => onDigit('7') },
      { label: '8', onClick: () => onDigit('8') },
      { label: '9', onClick: () => onDigit('9') },
      { label: '+', onClick: () => onOperator('+'), class: 'calc-op' },
      { label: '4', onClick: () => onDigit('4') },
      { label: '5', onClick: () => onDigit('5') },
      { label: '6', onClick: () => onDigit('6') },
      { label: '=', onClick: onEquals, class: 'calc-eq' },
      { label: '1', onClick: () => onDigit('1') },
      { label: '2', onClick: () => onDigit('2') },
      { label: '3', onClick: () => onDigit('3') },
      { label: '0', onClick: () => onDigit('0') },
      { label: '.', onClick: () => onDigit('.') },
    ];

    return (
      <div class="calculator-app">
        <div class="calculator-display" aria-live="polite">{display}</div>
        <div class="calculator-grid">
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              class={`btn ${b.class ?? ''}`}
              onClick={b.onClick}
              aria-label={b.label === 'C' ? 'Clear' : b.label}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return {
    render: () => <CalculatorUI />,
    getTitle: () => 'Calculator',
  };
}

export const calculatorApp = {
  id: 'calculator',
  name: 'Calculator',
  icon: '🔢',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: CalculatorApp,
};
