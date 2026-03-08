
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => preact.VNode;
  keyFn: (item: T, index: number) => string;
  class?: string;
}

export function List<T>({ items, renderItem, keyFn, class: cls = '' }: ListProps<T>) {
  return (
    <ul class={`list ${cls}`.trim()} role="list">
      {items.map((item, i) => (
        <li key={keyFn(item, i)}>{renderItem(item, i)}</li>
      ))}
    </ul>
  );
}
