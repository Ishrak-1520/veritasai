---
description: No-emoji policy – always use SVG icons (Lucide Icons) instead of emoji characters
---

# No-Emoji Policy

All VeritasAI builds must follow this rule: **never use emoji characters** in HTML, CSS, or JavaScript.

## What to Use Instead

Use **Lucide Icons** via CDN:

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

### Inline with text
```html
<i data-lucide="icon-name" class="icon-inline"></i> Label Text
```

### Inside icon containers
```html
<div class="feature-icon"><i data-lucide="icon-name"></i></div>
```

### After dynamic HTML injection
Always re-initialize Lucide after injecting HTML with icon elements:
```javascript
if (typeof lucide !== 'undefined') lucide.createIcons();
```

## Common Icon Mappings

| Purpose         | Lucide Icon Name  |
|-----------------|-------------------|
| Logo            | shield-check      |
| Lightning/CTA   | zap               |
| Analysis        | microscope        |
| AI/Brain        | brain             |
| Video           | clapperboard      |
| Image           | image             |
| Chart           | bar-chart-3       |
| Link/URL        | link              |
| List/History    | clipboard-list    |
| Upload          | upload            |
| Cloud upload    | cloud-upload      |
| Close/Remove    | x                 |
| Search          | search            |
| Empty state     | inbox             |
| Scan/Eye        | scan-eye          |

## Reference
- Icon browser: https://lucide.dev/icons
