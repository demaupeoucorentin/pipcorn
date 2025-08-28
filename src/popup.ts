// Popup script for PiPcorn extension

interface PopupElements {
  youtubeStatus: HTMLElement;
  nonYoutubeStatus: HTMLElement;
}

class PopupController {
  private elements: PopupElements;

  constructor() {
    this.elements = this.getElements();
    this.init();
  }

  private getElements(): PopupElements {
    return {
      youtubeStatus: document.getElementById('youtube-status')!,
      nonYoutubeStatus: document.getElementById('non-youtube-status')!
    };
  }

  private init(): void {
    this.updateStatus();
  }

  private async updateStatus(): Promise<void> {
    try {
      // Check if we're on a YouTube page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url?.includes('youtube.com')) {
        this.showNonYouTubeStatus();
        return;
      }

      this.showYouTubeStatus();
      
    } catch (error) {
      console.error('Failed to update status:', error);
      this.showNonYouTubeStatus();
    }
  }

  private showYouTubeStatus(): void {
    this.elements.youtubeStatus.classList.remove('hidden');
    this.elements.nonYoutubeStatus.classList.add('hidden');
  }

  private showNonYouTubeStatus(): void {
    this.elements.youtubeStatus.classList.add('hidden');
    this.elements.nonYoutubeStatus.classList.remove('hidden');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
