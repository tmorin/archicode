  try {
    const theme = localStorage.getItem('archicode-standalone-editor:theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { /* storage unavailable: the system's scheme */ }
