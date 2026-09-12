# MobileHint Component

A unified, accessible mobile hint component with modern design and consistent UX across the application.

## Features

- 🎨 **Modern Design**: Glassmorphism effect with gradient backgrounds
- 📱 **Mobile-First**: Optimized for mobile devices with responsive design
- ♿ **Accessible**: Full keyboard navigation and screen reader support
- 🌐 **Internationalized**: Uses react-intl for multi-language support
- 🎭 **Animated**: Smooth entrance animations with reduced motion support
- 🎯 **Type-Safe**: Full TypeScript support with predefined configurations

## Usage

### Basic Usage

```tsx
import MobileHint from '../shared/MobileHint';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';

function MyComponent() {
  const [showHint, setShowHint] = useState(true);

  return (
    <MobileHint
      isVisible={showHint}
      onClose={() => setShowHint(false)}
      steps={MOBILE_HINT_STEPS.VIDEO_PLAYER}
    />
  );
}
```

### Custom Steps

```tsx
<MobileHint
  isVisible={showHint}
  onClose={() => setShowHint(false)}
  steps={[
    { key: 'custom.step1' },
    { key: 'custom.step2', highlight: true },
    { key: 'custom.step3' }
  ]}
  titleKey="custom.title"
  closeButtonKey="custom.close"
/>
```

## Predefined Configurations

### VIDEO_PLAYER
For video player components with subtitle interaction:
- Step 1: Tap subtitle area to pause
- Step 2: iPhone selection instructions (highlighted)
- Step 3: Android selection instructions (highlighted)

### SONGS_AND_TEXT
For song lyrics and text components:
- Step 1: iPhone selection instructions (highlighted)
- Step 2: Android selection instructions (highlighted)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isVisible` | `boolean` | - | Controls hint visibility |
| `onClose` | `() => void` | - | Callback when hint is closed |
| `steps` | `MobileHintStep[]` | - | Array of hint steps |
| `titleKey` | `string` | `'mobileHint.title'` | i18n key for title |
| `closeButtonKey` | `string` | `'mobileHint.gotIt'` | i18n key for close button |

## MobileHintStep Interface

```tsx
interface MobileHintStep {
  key: string;        // i18n key for the step text
  highlight?: boolean; // Whether to highlight this step
}
```

## Accessibility Features

- **Keyboard Navigation**: Escape key closes the hint
- **Focus Management**: Auto-focuses the close button
- **Screen Reader Support**: Proper ARIA labels and roles
- **Reduced Motion**: Respects user's motion preferences

## Styling

The component uses CSS modules with the following classes:
- `.mobileHint` - Main overlay container
- `.mobileHintContent` - Content container with glassmorphism
- `.mobileHintTitle` - Title styling
- `.mobileHintList` - Steps list container
- `.mobileHintStep` - Individual step styling
- `.mobileHintHighlight` - Highlighted text styling
- `.closeHintButton` - Close button styling

## Localization Keys

Required i18n keys:
- `mobileHint.title` - "How to use:"
- `mobileHint.gotIt` - "Got it"
- `mobileHint.step1` - Video pause instruction
- `mobileHint.step2.iphone` - iPhone selection instruction
- `mobileHint.step2.android` - Android selection instruction
- `mobileHint.songs.step1` - iPhone selection for songs/text
- `mobileHint.songs.step2` - Android selection for songs/text

## Browser Support

- Modern browsers with CSS backdrop-filter support
- Graceful degradation for older browsers
- Mobile Safari and Chrome optimized
