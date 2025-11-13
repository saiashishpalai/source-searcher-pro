/**
 * Analytics helper for tracking user events
 * Currently uses console logging, can be extended to use PostHog, Mixpanel, etc.
 */

type AnalyticsEvent = 
  | 'wireframe_uploaded'
  | 'wireframe_removed'
  | 'requirements_generated'
  | 'wireframe_generation_failed'
  | 'wireframe_generation_started';

interface EventProperties {
  [key: string]: any;
}

class Analytics {
  private enabled: boolean;

  constructor() {
    // Enable analytics in production only (or via env var)
    this.enabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  }

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent, properties?: EventProperties): void {
    if (!this.enabled) {
      console.log(`[Analytics] ${event}`, properties);
      return;
    }

    // Log to console for now
    console.log(`[Analytics] ${event}`, properties);

    // TODO: Integrate with analytics provider (PostHog, Mixpanel, etc.)
    // Example for PostHog:
    // if (typeof window !== 'undefined' && (window as any).posthog) {
    //   (window as any).posthog.capture(event, properties);
    // }
  }

  /**
   * Track wireframe upload event
   */
  trackWireframeUpload(fileSize: number, fileType: string): void {
    this.track('wireframe_uploaded', {
      file_size: fileSize,
      file_type: fileType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track wireframe removal event
   */
  trackWireframeRemove(): void {
    this.track('wireframe_removed', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track requirements generation start
   */
  trackGenerationStart(hasContext: boolean, hasChunks: boolean): void {
    this.track('wireframe_generation_started', {
      has_context: hasContext,
      has_chunks: hasChunks,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track successful requirements generation
   */
  trackGenerationSuccess(confidence: number, wordCount: number, componentsDetected: number): void {
    this.track('requirements_generated', {
      confidence,
      word_count: wordCount,
      components_detected: componentsDetected,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track failed requirements generation
   */
  trackGenerationFailure(errorMessage: string): void {
    this.track('wireframe_generation_failed', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const analytics = new Analytics();

