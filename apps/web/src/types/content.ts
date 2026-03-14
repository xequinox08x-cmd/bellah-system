export interface ContentItem {
    id: number;
    title: string | null;
    prompt: string;
    output: string;
    platform: string;
    hashtags: string;
    status: 'draft' | 'approved' | 'rejected';
    createdAt: string;
}