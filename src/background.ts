// Background service worker for the PiPcorn extension

interface PiPMessage {
  action: string;
  [key: string]: any;
}

interface PiPResponse {
  isActive: boolean;
  isYouTube?: boolean;
  error?: string;
}

// Setup context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'youtube-pip',
      title: 'Picture in Picture',
      contexts: ['video'],
      documentUrlPatterns: ['*://*.youtube.com/*']
    });
    console.log('Context menu created successfully');
  } catch (error) {
    console.log('Context menu creation failed:', error);
  }
  
  // Set initial icon state
  updateIconState(false);
});

// Handle context menu clicks - Fixed
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'youtube-pip' && tab?.id) {
      togglePiPForTab(tab.id);
    }
  });
}

// Handle tab activation and updates to check YouTube status
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  setTimeout(async () => {
    await updateIconForCurrentTab();
  }, 100);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log('Tab updated:', tabId, changeInfo.status, tab.url);
  if (changeInfo.status === 'complete' || changeInfo.url) {
    setTimeout(async () => {
      await updateIconForCurrentTab();
    }, 100);
    
    // Re-inject content script if on YouTube watch page
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      ensureContentScriptLoaded(tabId);
    }
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((
  request: PiPMessage, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: PiPResponse) => void
) => {
  switch (request.action) {
    case 'toggle-pip':
      if (sender.tab?.id) {
        togglePiPForTab(sender.tab.id);
      }
      break;
    case 'pip-status':
      getPiPStatus(sendResponse);
      return true; // Keep the message channel open for async response
    case 'ping':
      sendResponse({ isActive: true });
      break;
    default:
      break;
  }
});

// Handle tab updates for YouTube navigation
chrome.tabs.onUpdated.addListener((
  tabId: number, 
  changeInfo: chrome.tabs.TabChangeInfo, 
  tab: chrome.tabs.Tab
) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('youtube.com/watch')) {
    ensureContentScriptLoaded(tabId);
  }
});

// Helper functions
async function togglePiPForTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'toggle-pip' });
  } catch (error) {
    console.error('Failed to toggle PiP:', error);
  }
}

async function getPiPStatus(sendResponse: (response: PiPResponse) => void): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes('youtube.com')) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'get-pip-status' });
      sendResponse(response);
    } else {
      sendResponse({ isActive: false, isYouTube: false });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendResponse({ isActive: false, error: errorMessage });
  }
}

async function ensureContentScriptLoaded(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
    }
  }
}

// Icon management functions
async function updateIconForCurrentTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab URL:', tab?.url);
    const isOnYouTube = tab?.url?.includes('youtube.com') || false;
    console.log('Is on YouTube:', isOnYouTube);
    await updateIconState(isOnYouTube);
  } catch (error) {
    console.error('Failed to update icon for current tab:', error);
    await updateIconState(false);
  }
}

async function updateIconState(isOnYouTube: boolean): Promise<void> {
  try {
    console.log('Updating icon state, isOnYouTube:', isOnYouTube);
    if (isOnYouTube) {
      // Normal colored icon when on YouTube
      await chrome.action.setIcon({
        path: {
          "16": "icons/icon16.png",
          "32": "icons/icon32.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      });
      console.log('Set colored icon');
    } else {
      // Grayed out icon when not on YouTube
      await chrome.action.setIcon({
        path: {
          "16": "icons/icon16-gray.png",
          "32": "icons/icon32-gray.png",
          "48": "icons/icon48-gray.png", 
          "128": "icons/icon128-gray.png"
        }
      });
      console.log('Set gray icon');
    }
  } catch (error) {
    console.error('Failed to set icon state:', error);
  }
}
