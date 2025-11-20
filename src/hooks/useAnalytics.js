import { track } from '@vercel/analytics';

/**
 * Custom hook for tracking analytics events
 * Provides a clean interface for tracking user interactions
 */
export const useAnalytics = () => {
    const trackEvent = (eventName, properties = {}) => {
        // In development, log to console
        if (import.meta.env.DEV) {
            console.log('📊 Analytics Event:', eventName, properties);
        }

        // Track the event
        track(eventName, properties);
    };

    return {
        // Navigation events
        trackNavClick: (label) => trackEvent('nav_click', { label }),

        // CTA events
        trackCTAClick: (location) => trackEvent('cta_click', { location }),

        // Waitlist events
        trackWaitlistOpen: () => trackEvent('waitlist_modal_open'),
        trackWaitlistSubmit: (success, error = null) => {
            trackEvent(success ? 'waitlist_submit_success' : 'waitlist_submit_error', {
                error: error || undefined
            });
        },

        // Prompt events
        trackPromptFocus: () => trackEvent('prompt_focus'),
        trackPromptSubmit: (textLength) => trackEvent('prompt_submit', { textLength }),

        // Social events
        trackSocialClick: (platform) => trackEvent('social_click', { platform }),

        // Generic event tracker
        track: trackEvent
    };
};
