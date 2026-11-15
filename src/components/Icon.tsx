type IconName = 'pdf' | 'phone' | 'telegram';
const paths: Record<IconName, string> = {
  pdf: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9z',
  telegram: 'M22 3 2 10.8l7.2 2.7L12 21l3.8-5 4.8 3.5L22 3z M9.2 13.5 22 3',
};
const Icon = ({ name }: { name: IconName }) => (
  <svg
    className={`icon icon-${name}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={paths[name]} />
    {name === 'pdf' && (
      <text
        x="6"
        y="17"
        fill="currentColor"
        stroke="none"
        fontSize="6"
        fontWeight="700"
      >
        PDF
      </text>
    )}
  </svg>
);
export default Icon;
