'use client';
import { useEffect, useRef, useState } from 'react';
import { phrases } from '../content/profile';

const PhraseSwitcher = () => {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [manualAt, setManualAt] = useState<number | null>(null);
  const lastManual = useRef<number | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const visibility = () => setVisible(!document.hidden);
    update();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (hovered || focused || reduced || !visible) return;
    let delay = 4000;
    if (lastManual.current !== null)
      delay = Math.max(0, 30000 - (Date.now() - lastManual.current));
    const timer = window.setTimeout(() => {
      lastManual.current = null;
      setIndex((current) => (current + 1) % phrases.length);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [index, hovered, focused, reduced, visible, manualAt]);
  const change = (delta: number) => {
    const now = Date.now();
    lastManual.current = now;
    setManualAt(now);
    setIndex((current) => (current + delta + phrases.length) % phrases.length);
  };
  const previous = () => change(-1);
  const next = () => change(1);
  return (
    <div
      className="switcher"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="phrase-line">
        <span className="ya" aria-hidden="true">
          Я
        </span>
        <div className="phrase-space">
          <span className="sr-only">Я </span>
          <span className="phrase-reserve" aria-hidden="true">
            {phrases.map((phrase) => (
              <span key={phrase}>{phrase}</span>
            ))}
          </span>
          <span key={index} className="phrase">
            {phrases[index]}
          </span>
        </div>
      </div>
      <div className="switcher-controls">
        <button type="button" onClick={previous} aria-label="Предыдущая фраза">
          ←
        </button>
        <div className="dots" aria-hidden="true">
          {phrases.map((phrase, i) => (
            <span key={phrase} className={i === index ? 'active' : ''} />
          ))}
        </div>
        <button type="button" onClick={next} aria-label="Следующая фраза">
          →
        </button>
      </div>
    </div>
  );
};
export default PhraseSwitcher;
