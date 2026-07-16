import { useEffect, useRef, useState } from 'react';
import type { DiceRoll } from '../types';

const DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const AUTO_ROLL_INTERVAL_MS = 200; // 5 rolls per second

interface DiceRollerProps {
  lastRoll: DiceRoll | null;
  rollHistory: DiceRoll[];
  onRoll: () => void;
}

export function DiceRoller({ lastRoll, rollHistory, onRoll }: DiceRollerProps) {
  const [autoRoll, setAutoRoll] = useState(false);
  // Keep a stable ref to onRoll so the interval never needs to be recreated.
  const onRollRef = useRef(onRoll);
  useEffect(() => { onRollRef.current = onRoll; }, [onRoll]);

  useEffect(() => {
    if (!autoRoll) return;
    const id = setInterval(() => onRollRef.current(), AUTO_ROLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRoll]);

  return (
    <div className="flex flex-col gap-3">
      {/* Roll button + auto checkbox + current result */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onRoll}
          disabled={autoRoll}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md active:scale-95 transition-all text-sm"
        >
          Roll Dice
        </button>

        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-300">
          <input
            type="checkbox"
            checked={autoRoll}
            onChange={(e) => setAutoRoll(e.target.checked)}
            className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
          />
          Auto
        </label>

        {lastRoll && (
          <div
            className="flex items-center gap-2 text-3xl select-none"
            title={`${lastRoll.die1} + ${lastRoll.die2} = ${lastRoll.sum}`}
          >
            <span>{DIE_FACES[lastRoll.die1]}</span>
            <span>{DIE_FACES[lastRoll.die2]}</span>
            <span className="text-lg font-bold text-amber-200 ml-1">= {lastRoll.sum}</span>
          </div>
        )}
      </div>

      {/* Roll history */}
      {rollHistory.length > 0 && (
        <div className="text-xs text-gray-400">
          <span className="font-semibold text-gray-300 mr-1">History:</span>
          {rollHistory
            .slice()
            .reverse()
            .slice(0, 12)
            .map((r, i) => (
              <span
                key={r.timestamp}
                className={`inline-block mr-1 px-1.5 py-0.5 rounded ${
                  i === 0 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                {r.sum}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
