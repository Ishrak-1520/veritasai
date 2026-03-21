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
    {
      id: 'ai_01',
      url: 'https://raw.githubusercontent.com/CompVis/stable-diffusion/main/assets/stable-samples/txt2img/merged-0006.png',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion sample 1',
      source: 'CompVis/stable-diffusion (GitHub)'
    },
    {
      id: 'ai_02',
      url: 'https://raw.githubusercontent.com/CompVis/stable-diffusion/main/assets/stable-samples/txt2img/merged-0005.png',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion sample 2',
      source: 'CompVis/stable-diffusion (GitHub)'
    },
    {
      id: 'ai_03',
      url: 'https://raw.githubusercontent.com/CompVis/stable-diffusion/main/assets/stable-samples/txt2img/merged-0004.png',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion sample 3',
      source: 'CompVis/stable-diffusion (GitHub)'
    },
    {
      id: 'ai_04',
      url: 'https://raw.githubusercontent.com/NVlabs/stylegan2/master/docs/teaser-1024x256.png',
      groundTruth: 'AI_GENERATED',
      label: 'StyleGAN2 faces',
      source: 'NVlabs/stylegan2 (GitHub)'
    },
    {
      id: 'ai_05',
      url: 'https://raw.githubusercontent.com/NVlabs/stylegan3/main/docs/stylegan3-t-ffhq-1024x1024.png',
      groundTruth: 'AI_GENERATED',
      label: 'StyleGAN3 portrait',
      source: 'NVlabs/stylegan3 (GitHub)'
    },
    {
      id: 'ai_06',
      url: 'https://raw.githubusercontent.com/CompVis/taming-transformers/master/assets/reconstruction_tfr.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'VQGAN reconstruction',
      source: 'CompVis/taming-transformers (GitHub)'
    },
    {
      id: 'ai_07',
      url: 'https://raw.githubusercontent.com/CompVis/taming-transformers/master/assets/teaser.png',
      groundTruth: 'AI_GENERATED',
      label: 'VQGAN teaser',
      source: 'CompVis/taming-transformers (GitHub)'
    },
    {
      id: 'ai_08',
      url: 'https://raw.githubusercontent.com/lucidrains/DALLE-pytorch/main/sample.png',
      groundTruth: 'AI_GENERATED',
      label: 'DALL-E PyTorch sample',
      source: 'lucidrains/DALLE-pytorch (GitHub)'
    },
    {
      id: 'ai_09',
      url: 'https://raw.githubusercontent.com/Stability-AI/stablediffusion/main/assets/stable-samples/txt2img/768/merged-0002.png',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion v2',
      source: 'Stability-AI/stablediffusion (GitHub)'
    },
    {
      id: 'ai_10',
      url: 'https://raw.githubusercontent.com/openai/DALL-E/master/images/encoded.png',
      groundTruth: 'AI_GENERATED',
      label: 'OpenAI DALL-E encoded',
      source: 'openai/DALL-E (GitHub)'
    }
  ]
};
