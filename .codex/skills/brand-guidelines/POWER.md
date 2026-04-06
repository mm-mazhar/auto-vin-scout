---
name: brand-guidelines
description: Enforces the project's visual identity, typography, and color logic. Use this to ensure new UI components match the existing SaaS boilerplate styling (Inter font, CSS variables, and Shadcn/Tailwind tokens).
license: Complete terms in LICENSE.txt
---

# Project Brand Styling

## Overview

This project uses a **multi-theme SaaS architecture**. Visuals must rely on semantic CSS variables rather than hardcoded colors to ensure they adapt to the user's selected theme (e.g., Dark, Light, Blue, Orange).

## Brand Guidelines

### Typography

- **Primary Font**: **Inter** (Sans-serif).
- **Implementation**: The font is loaded via `next/font/google` in the root layout.
- **Usage**:
  - Do not import external fonts like Poppins or Lora.
  - Rely on Tailwind's default `font-sans` stack which is configured to use Inter.

### Colors & Theming

**CRITICAL**: Do not use Hex codes (e.g., `#141413` or `#d97757`). You must use **Semantic Tailwind Classes** to ensure the UI adapts to the active theme (Green, Blue, Violet, etc.).

**Mapping:**

| UI Element | Tailwind Class | Concept |
| :--- | :--- | :--- |
| **Main Background** | `bg-background` | The page background color |
| **Main Text** | `text-foreground` | High-contrast text |
| **Primary Actions** | `bg-primary` `text-primary-foreground` | Main buttons, active states |
| **Secondary Elements** | `bg-secondary` `text-secondary-foreground` | Subtle badges, secondary buttons |
| **Muted Text** | `text-muted-foreground` | Subtitles, captions, metadata |
| **Borders** | `border-border` | Dividers, card outlines |
| **Cards/Panels** | `bg-card` `text-card-foreground` | Surface elements |

### Visual Details

- **Radius**: Use the global radius variable via Tailwind's `rounded-md` or `rounded-lg`. Do not hardcode pixels (e.g., `rounded-[4px]`).
- **Glassmorphism**: When requested via workflow, use: `bg-background/60 backdrop-blur-md border-border/50`.

## Technical Implementation Rules

1. **No Hardcoded Values**: Never write `color: #123456` or `font-family: 'Arial'`.
2. **Use Utility Classes**: Always use Tailwind utility classes that reference the CSS variables defined in `globals.css`.
3. **Dark Mode**: Do not write explicit `dark:` classes for basic colors. The semantic variables (`bg-background`, `text-foreground`) handle dark mode switching automatically via CSS variables.