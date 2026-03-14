export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: 'draft' | 'planned' | 'active' | 'completed';
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  content?: CampaignContent[];
}

export interface CampaignContent {
  id: number;
  title: string | null;
  output: string;
  platform: string;
  status: string;
  createdAt: string;
}