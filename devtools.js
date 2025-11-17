// Create the DevTools panel
chrome.devtools.panels.create(
  'Chrome Code',
  'icons/icon48.png',
  'panel.html',
  (panel) => {}
);
