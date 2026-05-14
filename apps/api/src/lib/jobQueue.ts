import { EventEmitter } from 'events';

// Simple in-memory job queue for background processing
// For production, consider Bull/BullMQ with Redis
export class JobQueue extends EventEmitter {
  private queue: Array<{ id: string; type: string; data: any; priority: number }> = [];
  private processing = false;
  private maxConcurrency = 2; // Process max 2 jobs simultaneously
  private activeJobs = 0;

  constructor() {
    super();
    this.startProcessing();
  }

  // Add job to queue
  async add(type: string, data: any, priority = 0): Promise<string> {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({ id: jobId, type, data, priority });

    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.emit('jobAdded', { jobId, type, data });

    return jobId;
  }

  // Start processing jobs
  private startProcessing(): void {
    setInterval(() => {
      if (!this.processing && this.queue.length > 0 && this.activeJobs < this.maxConcurrency) {
        this.processNextJob();
      }
    }, 1000); // Check every second
  }

  // Process next job in queue
  private async processNextJob(): Promise<void> {
    if (this.queue.length === 0 || this.activeJobs >= this.maxConcurrency) {
      return;
    }

    this.processing = true;
    this.activeJobs++;

    const job = this.queue.shift()!;
    this.emit('jobStarted', { jobId: job.id, type: job.type });

    try {
      await this.processJob(job);
      this.emit('jobCompleted', { jobId: job.id, type: job.type });
    } catch (error) {
      console.error(`[job-queue] job ${job.id} failed:`, error);
      this.emit('jobFailed', { jobId: job.id, type: job.type, error });
    } finally {
      this.activeJobs--;
      this.processing = false;
    }
  }

  // Process individual job based on type
  private async processJob(job: { id: string; type: string; data: any }): Promise<void> {
    switch (job.type) {
      case 'publish_content':
        await this.handleContentPublishing(job.data);
        break;
      case 'sync_metrics':
        await this.handleMetricsSync(job.data);
        break;
      case 'send_notification':
        await this.handleNotification(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  // Job handlers
  private async handleContentPublishing(data: any): Promise<void> {
    // Import here to avoid circular dependencies
    const { publishSystemContent } = await import('../services/facebook');

    console.info(`[job-queue] publishing content ${data.contentId}`);
    await publishSystemContent(data.contentId);
  }

  private async handleMetricsSync(data: any): Promise<void> {
    // Import here to avoid circular dependencies
    const { syncFacebookMetrics } = await import('../services/facebook');

    console.info(`[job-queue] syncing metrics for ${data.contentIds?.length || 0} posts`);
    await syncFacebookMetrics(data.contentIds);
  }

  private async handleNotification(data: any): Promise<void> {
    // Handle notifications (email, webhook, etc.)
    console.info(`[job-queue] sending notification: ${data.message}`);
    // Implement notification logic here
  }

  // Get queue statistics
  getStats() {
    return {
      queued: this.queue.length,
      active: this.activeJobs,
      totalProcessed: this.listenerCount('jobCompleted'),
    };
  }

  // Clear queue (for testing/emergency)
  clear(): void {
    this.queue = [];
    this.emit('queueCleared');
  }
}

// Global job queue instance
export const jobQueue = new JobQueue();

// Export job types for type safety
export const JOB_TYPES = {
  PUBLISH_CONTENT: 'publish_content',
  SYNC_METRICS: 'sync_metrics',
  SEND_NOTIFICATION: 'send_notification',
} as const;