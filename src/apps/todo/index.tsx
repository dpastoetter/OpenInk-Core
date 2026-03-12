import { useState, useCallback, useEffect } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const STORAGE_KEY = 'todo:list';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

function TodoApp(context: AppContext): AppInstance {
  const { storage } = context.services;

  function TodoUI() {
    const [items, setItems] = useState<TodoItem[]>([]);
    const [input, setInput] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      storage.get<TodoItem[]>(STORAGE_KEY).then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
        setLoaded(true);
      });
    }, [storage]);

    const persist = useCallback(
      (next: TodoItem[]) => {
        setItems(next);
        storage.set(STORAGE_KEY, next);
      },
      [storage]
    );

    const add = useCallback(() => {
      const text = input.trim();
      if (!text) return;
      const newItem: TodoItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        done: false,
        createdAt: Date.now(),
      };
      persist([...items, newItem]);
      setInput('');
    }, [input, items, persist]);

    const toggle = useCallback(
      (id: string) => {
        persist(
          items.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
        );
      },
      [items, persist]
    );

    const remove = useCallback(
      (id: string) => {
        persist(items.filter((it) => it.id !== id));
      },
      [items, persist]
    );

    const clearCompleted = useCallback(() => {
      persist(items.filter((it) => !it.done));
    }, [items, persist]);

    const hasCompleted = items.some((it) => it.done);

    if (!loaded) {
      return (
        <div class="todo-app">
          <p>Loading…</p>
        </div>
      );
    }

    return (
      <div class="todo-app">
        <p class="widget-hint">Add tasks. Tap to toggle done, remove when finished.</p>
        <div class="todo-add">
          <input
            type="text"
            class="input todo-input"
            placeholder="New task"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label="New task"
          />
          <button type="button" class="btn" onClick={add} disabled={!input.trim()}>
            Add
          </button>
        </div>
        <ul class="todo-list" aria-label="To-do list">
          {items.map((it) => (
            <li key={it.id} class={`todo-item ${it.done ? 'todo-item-done' : ''}`}>
              <button
                type="button"
                class="todo-check"
                onClick={() => toggle(it.id)}
                aria-label={it.done ? 'Mark not done' : 'Mark done'}
                aria-pressed={it.done}
              >
                {it.done ? '✓' : ''}
              </button>
              <span class="todo-text">{it.text}</span>
              <button
                type="button"
                class="btn todo-remove"
                onClick={() => remove(it.id)}
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <p class="todo-empty">No tasks yet. Add one above.</p>
        )}
        {hasCompleted && (
          <button type="button" class="btn btn-secondary todo-clear" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>
    );
  }

  return {
    render: () => <TodoUI />,
    getTitle: () => 'To-do',
  };
}

export const todoApp = {
  id: 'todo',
  name: 'To-do',
  icon: '☑️',
  iconFallback: '✓',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: TodoApp,
};
