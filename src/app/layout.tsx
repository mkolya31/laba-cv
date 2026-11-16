import type { Metadata } from 'next';
import './globals.css';
import YandexMetrika from '../components/YandexMetrika';
export const metadata: Metadata = {
  title: 'Максим Коляченко — Fullstack-разработчик',
  description:
    'От идеи до работающего продукта. Опыт Максима Коляченко: разработка, архитектура фронтенда и R&D.',
  openGraph: {
    title: 'Максим Коляченко — Fullstack-разработчик',
    description: 'Разрабатываю, внедряю и довожу до результата.',
    locale: 'ru_RU',
    type: 'website',
  },
};
const Layout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="ru">
    <body>
      <YandexMetrika />
      {children}
    </body>
  </html>
);
export default Layout;
