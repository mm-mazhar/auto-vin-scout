# Tasks

- [x] Task 1: Implement Project Context Logic
  - [ ] Create `getActiveProjectId` helper in `lib/project-helper.ts` (or similar) to resolve ID from cookie or default.
  - [ ] Update `app/actions/cookie-actions.ts` to add `switchProject` server action.

- [x] Task 2: Update Dashboard Layout
  - [ ] Modify `app/(dashboard)/layout.tsx` to fetch `projects` for the current organization.
  - [ ] Use `getActiveProjectId` to determine the active project.
  - [ ] Pass `projects` and `activeProjectId` to `ClientAppSidebar`.

- [x] Task 3: Create Project Switcher Component
  - [ ] Create `app/(dashboard)/_components/project-switcher.tsx`.
  - [ ] Implement dropdown UI (similar to TeamSwitcher) using `projects` list.
  - [ ] Call `switchProject` action on selection.

- [x] Task 4: Update Sidebar Components
  - [ ] Update `ClientAppSidebar.tsx` interface to accept `projects` and `activeProjectId`.
  - [ ] Update `AppSidebar.tsx` to accept `projects` and `activeProjectId`.
  - [ ] Modify `AppSidebar` structure:
    - Remove "Data" and "Documents" from `NavMain` (Dashboard children).
    - Add "Project" section using `SidebarGroup`.
    - Render `ProjectSwitcher` in the "Project" section.
    - Add navigation links for "Data" and "Documents" under the "Project" section.

- [x] Task 5: Update Page Context Awareness
  - [ ] Update `app/(dashboard)/dashboard/data/page.tsx` to read `activeProjectId` (via helper) and display it (e.g. "Data for Project: [Name]").
  - [ ] Update `app/(dashboard)/dashboard/documents/page.tsx` to read `activeProjectId` and display it.
