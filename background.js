// Background service worker for the extension
// Handles communication between DevTools panel and content scripts

// Keep track of active connections
const connections = new Map();

// Handle connections from DevTools panels
chrome.runtime.onConnect.addListener((port) => {
  const tabId = port.sender?.tab?.id || chrome.devtools?.inspectedWindow?.tabId;

  port.onMessage.addListener(async (message) => {
    if (message.type === 'INIT') {
      connections.set(message.tabId, port);
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

    if (message.type === 'CALL_GEMINI') {
      // Call Gemini API from background (no CORS restrictions)
      try {
        // Convert messages to Gemini format
        const geminiMessages = message.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${message.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: message.systemPrompt }]
            },
            contents: geminiMessages,
            generationConfig: {
              maxOutputTokens: 8192
            }
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        port.postMessage({
          type: 'GEMINI_RESPONSE',
          response: text
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
    const port = connections.get(sender.tab?.id);
    if (port) {
      port.postMessage({
        type: 'CONTENT_READY'
      });
    }
  }
  return true;
});
