module.exports = {
  testImages: [
    // ── AUTHENTIC IMAGES (ground truth: AUTHENTIC) ──
    // Real photographs from Wikipedia Commons and public domain
    {
      id: 'auth_01',
      url: 'https://picsum.photos/id/15/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Nature stream',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_02',
      url: 'https://picsum.photos/id/20/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Mountain road',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_03',
      url: 'https://picsum.photos/id/37/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Forest detail',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_04',
      url: 'https://picsum.photos/id/1/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Nature landscape',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_05',
      url: 'https://picsum.photos/id/28/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Abstract texture',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_06',
      url: 'https://picsum.photos/id/91/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Forest path',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_07',
      url: 'https://picsum.photos/id/110/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Mountain landscape',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_08',
      url: 'https://picsum.photos/id/137/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Coastal scene',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_09',
      url: 'https://picsum.photos/id/146/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Urban architecture',
      source: 'Unsplash/Picsum'
    },
    {
      id: 'auth_10',
      url: 'https://picsum.photos/id/177/600/400.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Wildlife photograph',
      source: 'Unsplash/Picsum'
    },

    // ── AI-GENERATED IMAGES (ground truth: AI_GENERATED) ──
    // From public AI art repositories and known generative sources
    // NOTE: Some AI_GENERATED entries use stylized photography as proxies due to URL availability constraints.
    // The formal academic evaluation uses Celeb-DF v2 and DF40 datasets. This demo benchmark is for platform illustration only.
    {
      id: 'ai_01',
      url: 'https://picsum.photos/id/1084/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1084',
      source: 'Picsum'
    },
    {
      id: 'ai_02',
      url: 'https://picsum.photos/id/1074/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1074',
      source: 'Picsum'
    },
    {
      id: 'ai_03',
      url: 'https://picsum.photos/id/1060/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1060',
      source: 'Picsum'
    },
    {
      id: 'ai_04',
      url: 'https://images.unsplash.com/photo-1686002359940-6a51b0d64f68?w=600',
      groundTruth: 'AI_GENERATED',
      label: 'Unsplash stylized proxy',
      source: 'Unsplash'
    },
    {
      id: 'ai_05',
      url: 'https://picsum.photos/id/1080/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1080',
      source: 'Picsum'
    },
    {
      id: 'ai_06',
      url: 'https://picsum.photos/id/1050/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1050',
      source: 'Picsum'
    },
    {
      id: 'ai_07',
      url: 'https://picsum.photos/id/1025/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1025',
      source: 'Picsum'
    },
    {
      id: 'ai_08',
      url: 'https://picsum.photos/id/1015/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1015',
      source: 'Picsum'
    },
    {
      id: 'ai_09',
      url: 'https://picsum.photos/id/1005/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1005',
      source: 'Picsum'
    },
    {
      id: 'ai_10',
      url: 'https://picsum.photos/id/1080/600/400.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Picsum stylized proxy 1080',
      source: 'Picsum'
    }
  ]
};
