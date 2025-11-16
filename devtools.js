// Create the DevTools panel
chrome.devtools.panels.create(
  'AI Code',
  'icons/icon48.png',
  'panel.html',
  (panel) => {}
);
