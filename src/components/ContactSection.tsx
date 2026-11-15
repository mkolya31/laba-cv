'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { parseConfig, type RuntimeConfig } from '../lib/runtime';

const subscribe = () => () => {};
const ContactSection = () => {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState(false);
  const started = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  let status = '';
  if (!config) status = 'Для открытия резюме и контактов включите JavaScript.';
  if (!config && started) status = 'Загружаю резюме и контакты…';
  if (error)
    status =
      'Резюме и контакты временно недоступны. Попробуйте обновить страницу позже.';
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch('/runtime-config.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unavailable');
        }
        return response.json();
      })
      .then((data: unknown) => setConfig(parseConfig(data)))
      .catch(() => setError(true))
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  return (
    <section
      id="contact"
      className="contact section-wrap"
      aria-labelledby="contact-title"
    >
      <span className="eyebrow">Продолжим знакомство</span>
      <h2 id="contact-title">
        Давайте поработаем
        <br />
        <em>вместе.</em>
      </h2>
      <p className="invitation">
        Изучите{' '}
        {config ? (
          <a href={config.resumeUrl} target="_blank" rel="noopener noreferrer">
            моё резюме ↗
          </a>
        ) : (
          <span>моё резюме</span>
        )}{' '}
        и свяжитесь, если интересно поработать со мной.
      </p>
      {config && (
        <div className="contact-actions">
          <a className="button primary" href={`tel:${config.phone}`}>
            ↗ Позвонить мне
          </a>
          <a className="button" href={config.telegramUrl}>
            Написать в телеге ↗
          </a>
        </div>
      )}
      <p className="status" role="status">
        {status}
      </p>
    </section>
  );
};
export default ContactSection;
