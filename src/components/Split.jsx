/* Heading whose words slide up out of their own mask (styled by [data-split] in styles.css) */
export default function Split({ as: Tag = 'h2', children }) {
  const text = String(children);
  return (
    <Tag data-split aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i}>
          <span className="w" aria-hidden="true"><span style={{ '--i': i }}>{w}</span></span>{' '}
        </span>
      ))}
    </Tag>
  );
}
