# Frontend Design Philosophy & Aesthetic Direction

## 1. Aesthetic Direction Answers
- **What problem does this interface solve, and for whom?**
  It provides an elegant, high-efficiency archiving and tracking interface for engineering/architectural blueprints and documents (Architectural, Structural, Surveying, Electrical, Mechanical). It is designed for engineers, draftsmen, auditors, and administrators at Mumtaz Pro consulting office.
- **What tone defines it?**
  **Editorial** (committed to an editorial-luxury architectural aesthetic, combining structured technical blueprints with rich cultural heritage).
- **What is the one thing users will remember most about this design?**
  The striking combination of modern asymmetric layout composition (large technical line numbers and overlapping blueprints/metadata) with a luxurious, deep heritage-inspired color palette (Deep Teal `#0B3D4E`, Warm Sand Gold `#C8963E`, and Alabaster `#F5F2EC`) and the interactive Mashrabiya grid overlays that react dynamically to state changes.

## 2. Design Rules & Constraints

### Typography
- **Display Font**: `"Playfair Display"`, `Georgia`, `serif` for headlines and luxury titles.
- **Body/Action Font**: `"Syne"`, `sans-serif` for headers, navigation, buttons, and badges.
- **Arabic Font**: `"Cairo"`, `sans-serif` for Arabic localized text.
- **Prohibited Fonts**: Never use Inter, Roboto, Arial, Space Grotesk, or generic system default sans-serif fonts.

### Color & Theme
- **Dominant Palette**:
  - Primary / Brand: Deep Teal (`#0B3D4E` to `#01080d`)
  - Accent / Highlights: Warm Sand Gold (`#C8963E` to `#dea035`)
  - Surface: Warm Alabaster / Chalk (`#F5F2EC`)
- **Theme Variables**: Use CSS variables for light and dark themes to maintain consistency.
- **Prohibited Colors**: Avoid safe, evenly-distributed palettes, generic purple gradients on white, or flat plain backgrounds.

### Motion
- **Core Strategy**: Staggered page-load reveal animations, asymmetric slide-ins, and high-impact entries.
- **Implementation**: CSS-only keyframe motion for HTML structure, custom Tailwind transition utilities, and Motion library where React animations are needed. Avoid weak hover effects; focus on memorable, high-impact motion.

### Spatial Composition
- **Layout Rules**: Break rigid layouts. Use asymmetry, overlap, diagonal flow, generous negative space, and controlled density.
- **Prohibited Layouts**: Avoid centered stacks, standard card grids, or cookie-cutter design with no context-specific identity.

### Backgrounds & Texture
- **Atmosphere**: Add atmosphere using the Mashrabiya pattern (geometric latticework), gradient meshes, noise, layered transparency, and decorative borders.
