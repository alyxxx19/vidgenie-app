// Centralized mock data for VidGenie SaaS
// HackFirst-style minimalist data structure

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  priority: 'low' | 'medium' | 'high';
  startDate: Date;
  endDate?: Date;
  contentCount: number;
  publishedCount: number;
  scheduledCount: number;
  platforms: string[];
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  filename: string;
  thumbnail: string;
  duration: number;
  size: string;
  uploadedAt: Date;
  project: string;
  tags: string[];
  description: string;
  used: number;
}

export interface Analytics {
  overview: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    avgEngagementRate: number;
    totalVideos: number;
    totalProjects: number;
    avgVideoLength: number;
  };
  performance: {
    viewsGrowth: number;
    engagementGrowth: number;
    followersGrowth: number;
    conversionRate: number;
  };
  platforms: Array<{
    name: string;
    views: number;
    engagement: number;
    color: string;
  }>;
  timelineData: Array<{
    date: string;
    views: number;
    engagement: number;
    videos: number;
  }>;
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
    platform: string;
    createdAt: Date;
  }>;
  audienceInsights: {
    demographics: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    topCountries: Array<{
      country: string;
      percentage: number;
      users: number;
    }>;
    peakHours: Array<{
      hour: string;
      engagement: number;
    }>;
  };
}

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Campagne Printemps 2024',
    description: 'Série de contenus lifestyle pour promouvoir la nouvelle collection printemps',
    status: 'active',
    priority: 'high',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-05-31'),
    contentCount: 24,
    publishedCount: 18,
    scheduledCount: 6,
    platforms: ['tiktok', 'instagram', 'youtube'],
    collaborators: ['marie@example.com', 'julien@example.com'],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: '2',
    name: 'Série Tutoriels Tech',
    description: 'Tutoriels courts sur les dernières technologies et outils de développement',
    status: 'active',
    priority: 'medium',
    startDate: new Date('2024-01-15'),
    contentCount: 12,
    publishedCount: 8,
    scheduledCount: 4,
    platforms: ['youtube', 'tiktok'],
    collaborators: ['alex@example.com'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-03-18'),
  },
  {
    id: '3',
    name: 'Content Marketing Q1',
    description: 'Stratégie de contenu pour le premier trimestre avec focus sur l\'engagement',
    status: 'completed',
    priority: 'high',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    contentCount: 36,
    publishedCount: 36,
    scheduledCount: 0,
    platforms: ['tiktok', 'instagram', 'youtube'],
    collaborators: ['sophie@example.com', 'thomas@example.com', 'claire@example.com'],
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-03-31'),
  },
];

// Mock Videos Data
export const mockVideos: Video[] = [
  {
    id: '1',
    filename: 'lifestyle_morning_routine.mp4',
    thumbnail: '/api/placeholder/400/225',
    duration: 28,
    size: '24.5 MB',
    uploadedAt: new Date('2024-01-15'),
    project: 'Campagne Printemps 2024',
    tags: ['lifestyle', 'morning', 'routine'],
    description: 'Routine matinale inspirante pour jeunes professionnels',
    used: 3,
  },
  {
    id: '2',
    filename: 'product_demo_smartphone.mp4',
    thumbnail: '/api/placeholder/400/225',
    duration: 45,
    size: '67.2 MB',
    uploadedAt: new Date('2024-01-12'),
    project: 'Série Tutoriels',
    tags: ['tech', 'smartphone', 'demo'],
    description: 'Démonstration des nouvelles fonctionnalités',
    used: 1,
  },
  {
    id: '3',
    filename: 'cooking_quick_recipe.mp4',
    thumbnail: '/api/placeholder/400/225',
    duration: 35,
    size: '41.8 MB',
    uploadedAt: new Date('2024-01-10'),
    project: 'Content Marketing Q1',
    tags: ['food', 'cooking', 'recipe'],
    description: 'Recette rapide et savoureuse en 5 minutes',
    used: 5,
  },
];

// Mock Analytics Data
export const mockAnalytics: Analytics = {
  overview: {
    totalViews: 2456780,
    totalLikes: 145230,
    totalShares: 23450,
    totalComments: 12340,
    avgEngagementRate: 8.7,
    totalVideos: 127,
    totalProjects: 8,
    avgVideoLength: 32,
  },
  
  performance: {
    viewsGrowth: 23.5,
    engagementGrowth: 12.8,
    followersGrowth: 18.2,
    conversionRate: 4.2,
  },
  
  platforms: [
    { name: 'TikTok', views: 1456780, engagement: 9.2, color: '#FF0050' },
    { name: 'Instagram', views: 678450, engagement: 7.8, color: '#E4405F' },
    { name: 'YouTube', views: 321550, engagement: 6.4, color: '#FF0000' },
  ],
  
  timelineData: [
    { date: '2024-01', views: 156780, engagement: 7.2, videos: 12 },
    { date: '2024-02', views: 234560, engagement: 8.1, videos: 18 },
    { date: '2024-03', views: 345670, engagement: 8.7, videos: 24 },
    { date: '2024-04', views: 456780, engagement: 9.2, videos: 21 },
    { date: '2024-05', views: 567890, engagement: 8.9, videos: 27 },
    { date: '2024-06', views: 634520, engagement: 9.5, videos: 25 },
  ],
  
  topContent: [
    {
      id: '1',
      title: 'Morning Routine Productive',
      views: 245670,
      engagement: 12.4,
      platform: 'TikTok',
      createdAt: new Date('2024-02-15'),
    },
    {
      id: '2',
      title: 'React Tips & Tricks',
      views: 198450,
      engagement: 11.2,
      platform: 'YouTube',
      createdAt: new Date('2024-03-02'),
    },
    {
      id: '3',
      title: 'Fashion Haul Spring',
      views: 176320,
      engagement: 10.8,
      platform: 'Instagram',
      createdAt: new Date('2024-02-28'),
    },
  ],
  
  audienceInsights: {
    demographics: [
      { name: '18-24', value: 35, color: '#8884d8' },
      { name: '25-34', value: 42, color: '#82ca9d' },
      { name: '35-44', value: 18, color: '#ffc658' },
      { name: '45+', value: 5, color: '#ff7c7c' },
    ],
    
    topCountries: [
      { country: 'France', percentage: 45, users: 125670 },
      { country: 'Canada', percentage: 22, users: 61450 },
      { country: 'Belgique', percentage: 15, users: 41230 },
      { country: 'Suisse', percentage: 18, users: 50120 },
    ],
    
    peakHours: [
      { hour: '08:00', engagement: 67 },
      { hour: '12:00', engagement: 89 },
      { hour: '18:00', engagement: 95 },
      { hour: '21:00', engagement: 78 },
    ],
  },
};

// Utility functions
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return { className: 'bg-white text-black font-mono text-xs', label: 'active' };
    case 'completed':
      return { className: 'bg-muted text-white font-mono text-xs', label: 'complete' };
    case 'paused':
      return { className: 'bg-secondary text-white font-mono text-xs', label: 'paused' };
    case 'archived':
      return { className: 'bg-muted-foreground text-black font-mono text-xs', label: 'archived' };
    default:
      return { className: 'bg-secondary font-mono text-xs', label: status };
  }
};

export const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return { className: 'border-white text-white font-mono text-xs', label: 'high' };
    case 'medium':
      return { className: 'border-muted-foreground text-muted-foreground font-mono text-xs', label: 'med' };
    case 'low':
      return { className: 'border-muted text-muted-foreground font-mono text-xs', label: 'low' };
    default:
      return { className: 'font-mono text-xs', label: priority };
  }
};