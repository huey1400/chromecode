// Content script that runs on CodePen pages (in isolated world)
// Communicates with inject.js (which runs in main world) via window.postMessage

// Notify background script that content is ready
chrome.runtime.sendMessage({ type: 'CONTENT_READY' });

// Message passing between isolated world (content.js) and main world (inject.js)
let messageId = 0;
const pendingMessages = new Map();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const message = event.data;
  if (message.source !== 'chrome-code-inject') return;

  const resolve = pendingMessages.get(message.id);
  if (resolve) {
    resolve(message.result);
    pendingMessages.delete(message.id);
  }
});

function sendToMainWorld(action, data = {}) {
  return new Promise((resolve) => {
    const id = messageId++;
    pendingMessages.set(id, resolve);

    window.postMessage({
      source: 'chrome-code-content',
      id,
      action,
      ...data
    }, '*');

    // Timeout after 1 second
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        resolve(null);
      }
    }, 1000);
  });
}

async function checkEditorsReady() {
  return await sendToMainWorld('checkReady');
}

async function getCode(editorType) {
  return await sendToMainWorld('getCode', { editorType });
}

async function getAllCode() {
  return await sendToMainWorld('getAllCode');
}

async function setCode(editorType, code, changedLines) {
  return await sendToMainWorld('setCode', { editorType, code, changedLines });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CODE') {
    getAllCode().then(code => {
      sendResponse({
        success: true,
        code: code
      });
    });
    return true; // Will respond asynchronously
  }

  if (message.type === 'UPDATE_CODE') {
    setCode(message.editor, message.code, message.changedLines).then(success => {
      sendResponse({
        success: success
      });
    });
    return true; // Will respond asynchronously
  }

  return true;
});

// Monitor for CodePen editor initialization
// Sometimes editors aren't ready immediately
let retryCount = 0;
const maxRetries = 10;

async function checkEditorsReadyLoop() {
  const ready = await checkEditorsReady();

  if (ready) {
    chrome.runtime.sendMessage({
      type: 'CONTENT_READY',
      editorsFound: {
        html: true,
        css: true,
        js: true
      }
    });
  } else if (retryCount < maxRetries) {
    retryCount++;
    setTimeout(checkEditorsReadyLoop, 1000);
  }
}

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkEditorsReadyLoop, 1000);
  });
} else {
  setTimeout(checkEditorsReadyLoop, 1000);
}
