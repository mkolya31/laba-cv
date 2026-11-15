'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { parseConfig, type RuntimeConfig } from '../lib/runtime';
import { sourceUrl } from '../content/profile';
import Icon from './Icon';

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
    let active = true;
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
      .then((data: unknown) => {
        if (active) setConfig(parseConfig(data));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
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
      <span className="eyebrow">03 / Продолжим знакомство</span>
      <h2 id="contact-title">
        Давайте поработаем
        <br />
        <em>вместе.</em>
      </h2>
      <p className="invitation">
        Изучите{' '}
        {config ? (
          <a href={config.resumeUrl} target="_blank" rel="noopener noreferrer">
            моё резюме <Icon name="pdf" />
          </a>
        ) : (
          <span>моё резюме</span>
        )}{' '}
        и свяжитесь, если интересно поработать со мной.
      </p>
      {config && (
        <div className="contact-actions">
          <a className="button primary" href={`tel:${config.phone}`}>
            <Icon name="phone" /> Позвонить мне
          </a>
          <a className="button" href={config.telegramUrl}>
            <Icon name="telegram" /> Написать в телеге
          </a>
        </div>
      )}
      <p className="status" role="status">
        {status}
      </p>
      <a
        className="text-link source-link"
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Исходный код этого сайта на GitHub ↗
      </a>
    </section>
  );
};
export default ContactSection;
