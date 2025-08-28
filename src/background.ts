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

interface TabState {
  isYouTubeVideo: boolean;
  wasPlayingVideo: boolean;
  pipActive: boolean;
  videoUrl?: string;
}

// Store tab states for automatic PiP management
const tabStates = new Map<number, TabState>();

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

// Store the previously active tab for PiP management
let previousActiveTabId: number | null = null;

// Handle tab activation and updates to check YouTube status
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  
  // Handle automatic PiP when switching tabs
  await handleTabSwitch(activeInfo.tabId, previousActiveTabId);
  
  // Update the previous tab ID
  previousActiveTabId = activeInfo.tabId;
  
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
    case 'video-playing-status':
      // Update tab state when video starts/stops playing
      if (sender.tab?.id && request.isPlaying !== undefined) {
        updateTabVideoState(sender.tab.id, request.isPlaying, request.videoUrl, request.pipActive);
      }
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

// Automatic PiP management functions
async function handleTabSwitch(currentTabId: number, previousTabId: number | null): Promise<void> {
  try {
    // If switching away from a YouTube tab with playing video, activate PiP
    if (previousTabId && previousTabId !== currentTabId) {
      const previousTabState = tabStates.get(previousTabId);
      if (previousTabState?.isYouTubeVideo && previousTabState.wasPlayingVideo && !previousTabState.pipActive) {
        console.log('Switching away from YouTube tab with playing video, activating PiP');
        await activatePiPForTab(previousTabId);
      }
    }

    // If switching back to a YouTube tab with active PiP, deactivate PiP
    try {
      const currentTab = await chrome.tabs.get(currentTabId);
      if (currentTab.url?.includes('youtube.com/watch')) {
        const currentTabState = tabStates.get(currentTabId);
        if (currentTabState?.pipActive) {
          console.log('Switching back to YouTube tab with active PiP, deactivating PiP');
          await deactivatePiPForTab(currentTabId);
        }
      }
    } catch (tabError) {
      // Tab might not exist anymore, ignore
      console.log('Could not get current tab info:', tabError);
    }
  } catch (error) {
    console.error('Error handling tab switch:', error);
  }
}

async function activatePiPForTab(tabId: number): Promise<void> {
  try {
    // Add a small delay to ensure the tab switch is complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const response = await chrome.tabs.sendMessage(tabId, { action: 'auto-activate-pip' });
    if (response?.success) {
      const tabState = tabStates.get(tabId) || { isYouTubeVideo: false, wasPlayingVideo: false, pipActive: false };
      tabState.pipActive = true;
      tabStates.set(tabId, tabState);
      console.log('PiP activated for tab:', tabId);
    } else {
      console.log('PiP activation was not successful for tab:', tabId);
    }
  } catch (error) {
    console.log('Failed to activate PiP for tab:', tabId, '- this is normal if user gesture required');
  }
}

async function deactivatePiPForTab(tabId: number): Promise<void> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'auto-deactivate-pip' });
    if (response?.success) {
      const tabState = tabStates.get(tabId);
      if (tabState) {
        tabState.pipActive = false;
        tabStates.set(tabId, tabState);
      }
      console.log('PiP deactivated for tab:', tabId);
    }
  } catch (error) {
    console.error('Failed to deactivate PiP for tab:', tabId, error);
  }
}

function updateTabVideoState(tabId: number, isPlaying: boolean, videoUrl?: string, pipActive?: boolean): void {
  const currentState = tabStates.get(tabId) || { 
    isYouTubeVideo: false, 
    wasPlayingVideo: false, 
    pipActive: false 
  };
  
  currentState.wasPlayingVideo = isPlaying;
  currentState.isYouTubeVideo = true;
  if (videoUrl) {
    currentState.videoUrl = videoUrl;
  }
  if (pipActive !== undefined) {
    currentState.pipActive = pipActive;
  }
  
  tabStates.set(tabId, currentState);
  console.log('Updated video state for tab:', tabId, { 
    isPlaying, 
    videoUrl, 
    pipActive: currentState.pipActive 
  });
}

// Clean up tab states when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
  console.log('Cleaned up state for closed tab:', tabId);
});
