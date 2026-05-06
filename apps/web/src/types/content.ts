export interface ContentItem {
    id: number;
    title: string | null;
    prompt: string;
    output: string;
    platform: string;
    hashtags: string;
    outputMode?: string;
    referenceImageUrl?: string | null;
    generatedImageUrl?: string | null;
    approvedAt?: string | null;
    scheduledAt?: string | null;
    publishedAt?: string | null;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'scheduled' | 'published';
    createdAt: string;
}
