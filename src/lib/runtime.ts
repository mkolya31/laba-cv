export type RuntimeConfig = {
  phone: string;
  telegramUrl: string;
  resumeUrl: string;
};
export const parseConfig = (value: unknown): RuntimeConfig => {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid configuration');
  const data = value as Record<string, unknown>;
  if (typeof data.phone !== 'string' || !/^\+[1-9]\d{7,14}$/.test(data.phone))
    throw new Error('Invalid phone');
  if (
    typeof data.telegramUrl !== 'string' ||
    typeof data.resumeUrl !== 'string'
  )
    throw new Error('Invalid URL');
  const telegram = new URL(data.telegramUrl);
  if (
    telegram.protocol !== 'https:' ||
    telegram.hostname !== 't.me' ||
    telegram.username ||
    telegram.password ||
    !/^\/\w{5,32}$/.test(telegram.pathname) ||
    telegram.search ||
    telegram.hash
  )
    throw new Error('Invalid Telegram');
  if (data.resumeUrl !== '/resume.pdf') {
    const resume = new URL(data.resumeUrl);
    if (resume.protocol !== 'https:' || resume.username || resume.password)
      throw new Error('Invalid resume URL');
  }
  return {
    phone: data.phone,
    telegramUrl: data.telegramUrl,
    resumeUrl: data.resumeUrl,
  };
};
