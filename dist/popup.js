"use strict";
// Popup script for PiPcorn extension
class PopupController {
    constructor() {
        this.elements = this.getElements();
        this.init();
    }
    getElements() {
        return {
            youtubeStatus: document.getElementById('youtube-status'),
            nonYoutubeStatus: document.getElementById('non-youtube-status')
        };
    }
    init() {
        this.updateStatus();
    }
    async updateStatus() {
        try {
            // Check if we're on a YouTube page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.url?.includes('youtube.com')) {
                this.showNonYouTubeStatus();
                return;
            }
            this.showYouTubeStatus();
        }
        catch (error) {
            console.error('Failed to update status:', error);
            this.showNonYouTubeStatus();
        }
    }
    showYouTubeStatus() {
        this.elements.youtubeStatus.classList.remove('hidden');
        this.elements.nonYoutubeStatus.classList.add('hidden');
    }
    showNonYouTubeStatus() {
        this.elements.youtubeStatus.classList.add('hidden');
        this.elements.nonYoutubeStatus.classList.remove('hidden');
    }
}
// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
