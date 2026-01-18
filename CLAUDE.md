# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Invoice Generator - A fully functional invoice generation application.

## Stack

- **Monorepo**: Turborepo
- **Frontend**: Next.js 15 with React 19, TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist middleware
- **PDF Generation**: @react-pdf/renderer
- **Testing**: Vitest with React Testing Library

## Project Structure

```
invoice-generator/
├── apps/
│   └── web/                    # Next.js application
│       └── src/
│           ├── app/            # Next.js App Router pages
│           ├── components/     # React components
│           │   ├── ui/         # shadcn/ui components
│           │   └── invoice/    # Invoice-specific components
│           ├── lib/            # Utilities and store
│           ├── hooks/          # Custom React hooks
│           └── test/           # Test setup
├── packages/
│   ├── shared-types/           # Zod schemas and TypeScript types
│   └── pdf-generator/          # PDF generation with @react-pdf/renderer
└── turbo.json                  # Turborepo configuration
```

## Commands

```bash
# Development
npm run dev              # Start all apps in development mode
npm run build            # Build all packages and apps
npm run lint             # Lint all packages
npm run test             # Run all tests

# Individual packages
npm run dev --filter=@invoice-generator/web
npm run test --filter=@invoice-generator/shared-types
```

## Key Features

1. **Invoice Form**: Complete form with all invoice fields organized in tabs
2. **Work Hours Tracking**: Calendar-based hour tracking with customizable default hours
3. **Schedule Configuration**: 15th/Last day/Both/Custom scheduling options
4. **Line Items**: Add additional charges or deductions
5. **Automatic Calculations**: Real-time totals with discount and tax
6. **Background Designs**: Multiple invoice design templates
7. **Page Sizes**: A4, Letter, Legal, Long, Short, A5, B5
8. **PDF Export**: High-quality PDF generation with @react-pdf/renderer
9. **Data Persistence**: Local storage via Zustand persist

## Performance Guidelines

1. **Eliminate waterfalls** - Use `Promise.all()` for independent operations
2. **Optimize bundle size** - Use direct imports, dynamic imports for heavy components
3. **Avoid unnecessary re-renders** - Use primitive dependencies, derive state where possible
