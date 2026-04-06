# Project Context & Navigation Spec

## Why
The current dashboard structure nests "Data" and "Documents" under "Dashboard", implying they are global or not clearly linked to a specific project context. The user wants to explicitly separate the "Dashboard" (projects overview) from the "Project" context (Data/Documents), making the navigation project-aware and allowing users to switch between projects globally.

## What Changes
- **Sidebar Restructuring**:
  - Move "Dashboard" to a top-level link (projects overview).
  - Create a new "Project" section in the sidebar.
  - Add a "Project Switcher" in the "Project" section to select the active project.
  - Move "Data" and "Documents" links under the "Project" section.
- **Project Context**:
  - Implement logic to resolve `activeProjectId` from the `current-project-id` cookie or default to the organization's first project.
  - Ensure `activeProjectId` is available to the sidebar and pages.
- **Server Actions**:
  - Add `switchProject` action to handle project switching (setting cookie and revalidating).
- **Page Logic**:
  - Update `layout.tsx` to fetch projects and determine `activeProjectId`.
  - Ensure `/dashboard/data` and `/dashboard/documents` pages use the `activeProjectId` for data fetching (even if dummy data for now).

## Impact
- **Affected Specs**: Dashboard navigation, Project management.
- **Affected Code**:
  - `app/(dashboard)/layout.tsx`
  - `app/(dashboard)/_components/app-sidebar.tsx`
  - `app/(dashboard)/_components/ClientAppSidebar.tsx` (props update)
  - `app/(dashboard)/_components/project-switcher.tsx` (New)
  - `app/actions/cookie-actions.ts`
  - `app/(dashboard)/dashboard/data/page.tsx` (Update to be project-aware)
  - `app/(dashboard)/dashboard/documents/page.tsx` (Update to be project-aware)

## ADDED Requirements
### Requirement: Project Switcher
The system SHALL provide a project switcher in the sidebar that allows users to switch the active project context.
- **WHEN** a user selects a project, **THEN** the `current-project-id` cookie is updated, and the page refreshes/redirects to reflect the new context.
- **WHEN** no project is selected (e.g. first load), **THEN** the system defaults to the first available project.

### Requirement: Project-Aware Navigation
The "Data" and "Documents" links SHALL be contextual to the selected project.
- The URL structure remains flat (`/dashboard/data`, `/dashboard/documents`), but the *content* displayed depends on the `activeProjectId`.

## MODIFIED Requirements
### Requirement: Sidebar Structure
- **Old**: Dashboard -> Data, Documents
- **New**:
  - Dashboard (Overview)
  - Project (Section)
    - [Project Switcher]
    - Data
    - Documents
