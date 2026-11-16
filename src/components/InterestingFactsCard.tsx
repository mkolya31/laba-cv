import { interestingFacts, podcasts } from '../content/profile';

const InterestingFactsCard = () => (
  <article className="case facts-card" aria-labelledby="facts-title">
    <div className="case-top">
      <span>Ещё обо мне</span>
      <span>06</span>
    </div>
    <h3 id="facts-title">За пределами кода</h3>
    <ul className="facts-list">
      {interestingFacts.map((fact) => (
        <li key={fact}>{fact}</li>
      ))}
    </ul>
    <div className="podcasts">
      <h4>Подкасты со мной</h4>
      <ul className="podcast-list">
        {podcasts.map((podcast) => (
          <li key={podcast.href}>
            <a href={podcast.href} target="_blank" rel="noopener noreferrer">
              {podcast.title} <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
    <a className="button facts-resume" href="#contact">
      Перейти к резюме ↓
    </a>
  </article>
);

export default InterestingFactsCard;
