/* Runs before paint so the saved theme never flashes. Kept as a static file to allow a strict script-src CSP. */
(function () {
  try {
    var preference = localStorage.getItem('dentalconnect-theme') || 'system';
    var dark =
      preference === 'dark' ||
      (preference === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch {
    /* Private mode: the app applies the system theme when it mounts. */
  }
})();
