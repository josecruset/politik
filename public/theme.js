(() => {
  const key = 'politik-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  let followsSystem = saved !== 'dark' && saved !== 'light';

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren';
    }
  }
  // Apply before the stylesheet loads to avoid a flash in the wrong theme.
  apply(followsSystem ? (system.matches ? 'dark' : 'light') : saved);
  system.addEventListener('change', event => {
    if (followsSystem) apply(event.matches ? 'dark' : 'light');
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply(document.documentElement.dataset.theme);
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      followsSystem = false;
      apply(theme);
      try { localStorage.setItem(key, theme); } catch {}
    });
  });
})();
