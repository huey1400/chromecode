// Background service worker for the extension
// Handles communication between DevTools panel and content scripts

// Keep track of active connections
const connections = new Map();

// Handle connections from DevTools panels
chrome.runtime.onConnect.addListener((port) => {
  console.log('DevTools panel connected');

  // Store the connection
  const tabId = port.sender?.tab?.id || chrome.devtools?.inspectedWindow?.tabId;

  port.onMessage.addListener(async (message) => {
    console.log('Message from panel:', message);

    if (message.type === 'INIT') {
      // Store the port for this tab
      console.log('✓ Storing connection for tab:', message.tabId);
      connections.set(message.tabId, port);
      console.log('Active connections after INIT:', Array.from(connections.keys()));
      return;
    }

    if (message.type === 'GET_CODE') {
      // Forward request to content script
      try {
        const response = await chrome.tabs.sendMessage(message.tabId, {
          type: 'GET_CODE'
        });
        port.postMessage({
          type: 'CODE_DATA',
          data: response
        });
      } catch (error) {
        port.postMessage({
          type: 'ERROR',
          error: error.message
        });
      }
    }

    if (message.type === 'UPDATE_CODE') {
      // Forward code update to content script
      try {
        const response = await chrome.tabs.sendMessage(message.tabId, {
          type: 'UPDATE_CODE',
          editor: message.editor,
          code: message.code,
          changedLines: message.changedLines
        });
        port.postMessage({
          type: 'UPDATE_RESULT',
          success: response.success
        });
      } catch (error) {
        port.postMessage({
          type: 'ERROR',
          error: error.message
        });
      }
    }

    if (message.type === 'CALL_CLAUDE') {
      // Call Claude API from background (no CORS restrictions)
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': message.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: message.systemPrompt,
            messages: message.messages
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        port.postMessage({
          type: 'CLAUDE_RESPONSE',
          response: data.content[0].text
        });
      } catch (error) {
        port.postMessage({
          type: 'ERROR',
          error: error.message
        });
      }
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('DevTools panel disconnected');
    // Clean up the connection
    for (const [tabId, p] of connections.entries()) {
      if (p === port) {
        connections.delete(tabId);
        break;
      }
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_READY') {
    console.log('✓ Content script ready on tab:', sender.tab?.id);
    console.log('Active connections:', Array.from(connections.keys()));

    // Notify the DevTools panel if it's connected
    const port = connections.get(sender.tab?.id);
    if (port) {
      console.log('✓ Forwarding CONTENT_READY to DevTools panel');
      port.postMessage({
        type: 'CONTENT_READY'
      });
    } else {
      console.log('✗ No DevTools panel connected for this tab yet');
    }
  }
  return true;
});
