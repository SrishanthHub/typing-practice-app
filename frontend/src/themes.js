export const THEMES = {
  serika_dark: {
    label: 'Serika Dark',
    bg: '#323437',
    sub: '#646669',
    text: '#d1d0c5',
    main: '#e2b714',
    error: '#ca4754',
    caret: '#e2b714',
    panel: '#2c2e31'
  },
  dracula: {
    label: 'Dracula',
    bg: '#282a36',
    sub: '#6272a4',
    text: '#f8f8f2',
    main: '#bd93f9',
    error: '#ff5555',
    caret: '#bd93f9',
    panel: '#21222c'
  },
  nord: {
    label: 'Nord',
    bg: '#2e3440',
    sub: '#4c566a',
    text: '#eceff4',
    main: '#88c0d0',
    error: '#bf616a',
    caret: '#88c0d0',
    panel: '#272c36'
  },
  ocean: {
    label: 'Ocean',
    bg: '#0f2027',
    sub: '#4a6572',
    text: '#e0fbfc',
    main: '#5ec2c9',
    error: '#ff6b6b',
    caret: '#5ec2c9',
    panel: '#0b1a1f'
  },
  light: {
    label: 'Daylight',
    bg: '#f2f2f2',
    sub: '#9b9b9b',
    text: '#2c2c2c',
    main: '#c7811a',
    error: '#d13b3b',
    caret: '#c7811a',
    panel: '#e6e6e6'
  }
};

export function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.serika_dark;
  const root = document.documentElement;
  root.style.setProperty('--bg-color', theme.bg);
  root.style.setProperty('--sub-color', theme.sub);
  root.style.setProperty('--text-color', theme.text);
  root.style.setProperty('--main-color', theme.main);
  root.style.setProperty('--error-color', theme.error);
  root.style.setProperty('--caret-color', theme.caret);
  root.style.setProperty('--panel-color', theme.panel);
}
