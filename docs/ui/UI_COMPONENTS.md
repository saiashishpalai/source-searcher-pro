# UI Components Documentation

This document describes the UI components and their behavior in the Haven7 application.

## Sidebar Component

### Overview
The sidebar is a collapsible navigation panel that provides access to conversations, recent searches, and navigation options.

### Default State
The sidebar **starts in a collapsed state by default** to maximize screen real estate for the main content area.

### Behavior

#### Desktop (Large Screens)
- **Default**: Collapsed (64px width, showing only icons)
- **Expanded**: Full width (320px width, showing labels and full content)
- **Toggle**: Users can click the menu button inside the sidebar to expand/collapse
- **Visibility**: Always visible on desktop (not hidden off-screen)

#### Mobile (Small Screens)
- **Default**: Hidden off-screen
- **Toggle**: Users can open the sidebar using the menu button in the header
- **Overlay**: When open, a dark overlay appears behind the sidebar
- **Close**: Clicking the overlay or selecting a conversation closes the sidebar

### State Management

The sidebar state is managed using React hooks:

```typescript
const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default: collapsed
const [showMobileSidebar, setShowMobileSidebar] = useState(false); // Default: hidden on mobile
```

### Styling

- **Collapsed Width**: `w-16` (64px)
- **Expanded Width**: `w-80` (320px)
- **Background**: Gradient with backdrop blur
- **Border**: Right border with subtle opacity
- **Transitions**: Smooth 500ms transitions for all state changes

### User Experience

1. **Initial Load**: Sidebar appears collapsed, giving users more space for content
2. **Expansion**: Users can expand the sidebar when they need to see full labels or access navigation
3. **Persistence**: The collapsed/expanded state is maintained during the session
4. **Responsive**: Automatically adapts to mobile with a slide-in/out behavior

### Implementation Location

- **Component**: `src/components/SearchInterface.tsx`
- **State**: Lines 305-306
- **Rendering**: Lines 1470-1682

### Future Enhancements

- [ ] Persist sidebar state in localStorage
- [ ] Add keyboard shortcut to toggle sidebar
- [ ] Add animation preferences for sidebar transitions

