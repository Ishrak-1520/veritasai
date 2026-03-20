module.exports = {
  testImages: [
    // ── AUTHENTIC IMAGES (ground truth: AUTHENTIC) ──
    // Real photographs from Wikipedia Commons and public domain
    {
      id: 'auth_01',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Ant macro photograph',
      source: 'Wikipedia Commons'
    },
    {
      id: 'auth_02',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bikesgray.jpg/320px-Bikesgray.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Bicycles photograph',
      source: 'Wikipedia Commons'
    },
    {
      id: 'auth_03',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Stonehenge.jpg/320px-Stonehenge.jpg',
      groundTruth: 'AUTHENTIC',
      label: 'Stonehenge landscape',
      source: 'Wikipedia Commons'
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/A_cat_in_a_field_of_flowers%2C_created_with_Stable_Diffusion.jpg/320px-A_cat_in_a_field_of_flowers%2C_created_with_Stable_Diffusion.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion cat',
      source: 'Wikipedia Commons (Stable Diffusion)'
    },
    {
      id: 'ai_02',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/A_Midjourney_generated_image_of_a_woman.jpg/240px-A_Midjourney_generated_image_of_a_woman.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Midjourney portrait',
      source: 'Wikipedia Commons (Midjourney)'
    },
    {
      id: 'ai_03',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/thirty/Eliezer_Yudkowsky-2021-photo-DALL-E.jpg/240px-Eliezer_Yudkowsky-2021-photo-DALL-E.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'DALL-E portrait',
      source: 'Wikipedia Commons (DALL-E)'
    },
    {
      id: 'ai_04',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Artificial_intelligence_and_blockchain_in_social_media_generated_by_stable_diffusion.jpg/320px-Artificial_intelligence_and_blockchain_in_social_media_generated_by_stable_diffusion.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion abstract',
      source: 'Wikipedia Commons (Stable Diffusion)'
    },
    {
      id: 'ai_05',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/2023_Stable_Diffusion_XL_-_Astronaut.jpg/256px-2023_Stable_Diffusion_XL_-_Astronaut.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion XL astronaut',
      source: 'Wikipedia Commons (SDXL)'
    },
    {
      id: 'ai_06',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Gotham.jpg/310px-Above_Gotham.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'AI cityscape',
      source: 'Wikipedia Commons (AI)'
    },
    {
      id: 'ai_07',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/A_vision_for_the_future_of_sustainable_energy%2C_AI-generated_art.jpg/320px-A_vision_for_the_future_of_sustainable_energy%2C_AI-generated_art.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'AI energy concept art',
      source: 'Wikipedia Commons (AI)'
    },
    {
      id: 'ai_08',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Nightcafe_-_woman.jpg/256px-Nightcafe_-_woman.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'NightCafe AI portrait',
      source: 'Wikipedia Commons (NightCafe)'
    },
    {
      id: 'ai_09',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Stable_Diffusion_img2img_eagle.jpg/320px-Stable_Diffusion_img2img_eagle.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'Stable Diffusion eagle',
      source: 'Wikipedia Commons (Stable Diffusion)'
    },
    {
      id: 'ai_10',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/twenty/DALL-E_2_image_of_a_panda_making_latte_art.jpg/256px-DALL-E_2_image_of_a_panda_making_latte_art.jpg',
      groundTruth: 'AI_GENERATED',
      label: 'DALL-E 2 panda',
      source: 'Wikipedia Commons (DALL-E 2)'
    }
  ]
};
