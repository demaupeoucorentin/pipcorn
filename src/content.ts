// Content script for YouTube Picture-in-Picture functionality
interface PiPManager {
  isActive: boolean;
  currentVideo: HTMLVideoElement | null;
  pipButton: HTMLElement | null;
  controls: HTMLElement | null;
}

class YouTubePiPController {
  public pipManager: PiPManager = {
    isActive: false,
    currentVideo: null,
    pipButton: null,
    controls: null
  };

  constructor() {
    this.init();
  }

  private init(): void {
    // Wait for page load and YouTube's dynamic content
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPiP());
    } else {
      this.setupPiP();
    }

    // Handle YouTube's single-page app navigation
    this.observeUrlChanges();
  }

  private setupPiP(): void {
    this.waitForVideo(() => {
      this.createPiPButton();
      this.attachEventListeners();
    });
  }

  private waitForVideo(callback: () => void): void {
    const checkForVideo = () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video && video.src) {
        this.pipManager.currentVideo = video;
        callback();
      } else {
        setTimeout(checkForVideo, 500);
      }
    };
    checkForVideo();
  }

  private createPiPButton(): void {
    // Remove existing button if it exists
    this.removePiPButton();

    // Create PiP button
    const pipButton = document.createElement('button');
    pipButton.className = 'pipcorn-button';
    pipButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
      </svg>
      <span>PiP</span>
    `;
    pipButton.title = 'Picture in Picture (P)';
    pipButton.setAttribute('aria-label', 'Picture in Picture');

    // Find YouTube's control bar and insert the button
    const controlsContainer = this.findControlsContainer();
    if (controlsContainer) {
      controlsContainer.appendChild(pipButton);
      this.pipManager.pipButton = pipButton;
    }
  }

  private findControlsContainer(): HTMLElement | null {
    // Try multiple selectors for YouTube's control bar
    const selectors = [
      '.ytp-right-controls',
      '.ytp-chrome-controls .ytp-right-controls',
      '[class*="controls"] [class*="right"]'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector) as HTMLElement;
      if (container) {
        return container;
      }
    }

    return null;
  }

  private removePiPButton(): void {
    const existingButton = document.querySelector('.pipcorn-button');
    if (existingButton) {
      existingButton.remove();
    }
  }

  private attachEventListeners(): void {
    if (!this.pipManager.pipButton || !this.pipManager.currentVideo) return;

    // PiP button click handler
    this.pipManager.pipButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePictureInPicture();
    });

    // Keyboard shortcut (P key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        // Only trigger if not typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
          return;
        }
        e.preventDefault();
        this.togglePictureInPicture();
      }
    });

    // PiP event listeners
    this.pipManager.currentVideo.addEventListener('enterpictureinpicture', () => {
      this.pipManager.isActive = true;
      this.updateButtonState();
      this.createPiPControls();
    });

    this.pipManager.currentVideo.addEventListener('leavepictureinpicture', () => {
      this.pipManager.isActive = false;
      this.updateButtonState();
      this.removePiPControls();
    });

    // Video quality and playback event listeners
    this.pipManager.currentVideo.addEventListener('loadedmetadata', () => {
      this.updatePiPIfActive();
    });
  }

  public async togglePictureInPicture(): Promise<void> {
    if (!this.pipManager.currentVideo) return;

    try {
      if (this.pipManager.isActive) {
        await document.exitPictureInPicture();
      } else {
        await this.pipManager.currentVideo.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
      this.showNotification('Picture-in-Picture not supported or failed to activate');
    }
  }

  private updateButtonState(): void {
    if (!this.pipManager.pipButton) return;

    const button = this.pipManager.pipButton;
    if (this.pipManager.isActive) {
      button.classList.add('active');
      button.title = 'Exit Picture in Picture (P)';
    } else {
      button.classList.remove('active');
      button.title = 'Picture in Picture (P)';
    }
  }

  private createPiPControls(): void {
    // Create enhanced controls for PiP mode
    if (!this.pipManager.currentVideo) return;

    // Add custom controls overlay (this appears in the PiP window)
    const video = this.pipManager.currentVideo;
    
    // Store original controls state
    const originalControls = video.controls;
    video.controls = true; // Ensure basic controls are available in PiP
  }

  private removePiPControls(): void {
    // Clean up any PiP-specific controls
    this.pipManager.controls = null;
  }

  private updatePiPIfActive(): void {
    // Update PiP if currently active (useful for quality changes)
    if (this.pipManager.isActive && this.pipManager.currentVideo) {
      // The browser handles most updates automatically
      console.log('PiP updated for new video source');
    }
  }

  private showNotification(message: string): void {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'pipcorn-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private observeUrlChanges(): void {
    let currentUrl = location.href;
    
    const observer = new MutationObserver(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        // Re-initialize on URL change (YouTube SPA navigation)
        setTimeout(() => this.setupPiP(), 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the controller when the script loads
(() => {
  'use strict';
  
  // Check if Picture-in-Picture is supported
  if ('pictureInPictureEnabled' in document) {
    const controller = new YouTubePiPController();
    
    // Handle messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'toggle-pip':
          controller.togglePictureInPicture();
          sendResponse({ success: true });
          break;
        case 'get-pip-status':
          sendResponse({ 
            isActive: controller.pipManager.isActive,
            isYouTube: true 
          });
          break;
        case 'ping':
          sendResponse({ pong: true });
          break;
        default:
          break;
      }
    });
  } else {
    console.warn('Picture-in-Picture is not supported in this browser');
  }
})();
