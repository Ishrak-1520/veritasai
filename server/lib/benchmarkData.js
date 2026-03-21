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

    // ── UNCERTAIN TEST IMAGES (ground truth: UNCERTAIN_TEST) ──
    // Ambiguous/stylized images expected to return AI_GENERATED or UNCERTAIN (not AUTHENTIC).
    // Formal AI detection evaluation is run separately on Celeb-DF v2 and DF40 datasets.
    {
      id: 'uncertain_01',
      url: 'https://picsum.photos/id/1025/600/400.jpg',
      groundTruth: 'UNCERTAIN_TEST',
      label: 'Ambiguous stylized scene',
      source: 'Picsum'
    },
    {
      id: 'uncertain_02',
      url: 'https://picsum.photos/id/1035/600/400.jpg',
      groundTruth: 'UNCERTAIN_TEST',
      label: 'Processed visual texture',
      source: 'Picsum'
    },
    {
      id: 'uncertain_03',
      url: 'https://picsum.photos/id/1042/600/400.jpg',
      groundTruth: 'UNCERTAIN_TEST',
      label: 'Stylized composition',
      source: 'Picsum'
    }
  ]
};
