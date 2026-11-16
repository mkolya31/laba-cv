import PhraseSwitcher from '../components/PhraseSwitcher';
import ContactSection from '../components/ContactSection';
import InterestingFactsCard from '../components/InterestingFactsCard';
import { cases, sourceUrl } from '../content/profile';

const Home = () => (
  <>
    <a className="skip" href="#cases">
      Перейти к кейсам
    </a>
    <header className="site-header section-wrap">
      <a className="brand" href="/">
        kolyach<span>.me</span>
        <span className="brand-slash">/</span>dev
      </a>
      <span className="availability">
        <i /> Открыт к работе в R&D
      </span>
    </header>
    <main>
      <section className="hero section-wrap" aria-labelledby="hero-name">
        <div className="portrait-wrap">
          <img
            className="portrait"
            src="/portrait.webp"
            width="1400"
            height="2100"
            alt="Максим Коляченко"
            fetchPriority="high"
          />
          <div className="portrait-caption">
            <span>01 / Знакомство</span>
          </div>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Fullstack-разработчик</p>
          <h1 id="hero-name">
            Максим
            <br />
            Коляченко<span className="name-dot">.</span>
          </h1>
          <PhraseSwitcher />
          <p className="hero-intro">
            Самостоятельно довожу идеи до работающих продуктов.
            <br />
            Проектирую, разрабатываю, внедряю.
          </p>
          <a className="text-link" href="#cases">
            Посмотреть, что я сделал <span>↓</span>
          </a>
        </div>
      </section>
      <section
        id="cases"
        className="cases section-wrap"
        aria-labelledby="cases-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 / От замысла к результату</p>
            <h2 id="cases-title">
              Что я уже <em>сделал.</em>
            </h2>
          </div>
          <p>
            Пять историй о разработке,
            <br />
            инициативе и ответственности.
          </p>
        </div>
        <div className="case-grid">
          {cases.map((item) => (
            <article
              className={`case project-case case-${item.id}`}
              key={item.id}
            >
              <div className="case-top">
                <span>{item.label}</span>
                <span>{item.number}</span>
              </div>
              <h3>{item.title}</h3>
              <div className="metric">
                {item.metric}
                <span>{item.caption}</span>
              </div>
              <p>{item.text}</p>
              <p>{item.contribution}</p>
              <p className="result">{item.result}</p>
              {'href' in item && (
                <a
                  className="text-link"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Посмотреть SberUnity ↗
                </a>
              )}
            </article>
          ))}
          <InterestingFactsCard />
        </div>
      </section>
      <ContactSection />
      <section className="about-site section-wrap" aria-labelledby="site-title">
        <div>
          <p className="eyebrow">04 / Этот сайт — тоже мой проект</p>
          <h2 id="site-title">
            От идеи
            <br />
            <em>до этой страницы.</em>
          </h2>
        </div>
        <div>
          <p>
            Я написал этот сайт, используя Codex, OpenSpec, React + Next.js и
            Git + GitHub.
          </p>
          <div className="tech-tags">
            {['Codex', 'OpenSpec', 'React + Next.js', 'Git + GitHub'].map(
              (tag) => (
                <span key={tag}>{tag}</span>
              ),
            )}
          </div>
          <p className="muted">
            Подготовил статическую сборку, конфигурацию nginx для VPS на Ubuntu
            и автоматическую доставку через GitHub Actions.
          </p>
          <a
            className="text-link source-link"
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Исходный код этого сайта на GitHub ↗
          </a>
        </div>
      </section>
    </main>
    <footer className="section-wrap footer">
      <span>Максим Коляченко</span>
      <a href="#hero-name">К началу ↑</a>
      <span>Сделано с интересом к делу.</span>
    </footer>
  </>
);
export default Home;
