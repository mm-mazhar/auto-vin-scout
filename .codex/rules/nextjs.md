---
description: Technical standards for Next.js 16+, oRPC, Supabase, and App Router architecture.
globs: "**/*.tsx, **/*.ts, next.config.*, lib/orpc/**/*.ts"
---

# Next.js 16 Engineering Standards

<Philosophy>
We build "Contract-First". The Data Layer (oRPC) is the single source of truth.
We separate Data Definition (Zod Schemas/Routers) from UI Implementation.
We prefer explicit typing and validation over "magic" fetching.
</Philosophy>

## 1. oRPC & Data Layer (Strict Requirement)
**Trigger Skills or Powers:** `/orpc-contract-first`, `/zod-schema-validation`

**The Golden Rule:** DO NOT use `fetch`, `axios`, or raw Server Actions (`'use server'`) for application data. **ALWAYS use oRPC.**

### Workflow: Contract-First Development
Before writing any React component, you must establish the backend contract:
1.  **Define Schema:** Create Zod schemas for Input and Output in `lib/orpc/schemas` (or inline if simple).
2.  **Define Procedure:** Create the procedure in `lib/orpc/routers/{domain}.ts`.
3.  **Register:** Ensure the router is merged into `lib/orpc/root.ts`.
4.  **Implement UI:** Only then, build the component consuming the procedure.

### Implementation Patterns
*   **Server Components (RSC):**
    Use the direct caller (usually `rsc-client` or server caller) to fetch data without HTTP overhead.
    ```tsx
    // ✅ Correct: calling oRPC from Server Component
    import { orpc } from '@/lib/orpc/rsc-client' 
    
    export default async function Page() {
      const data = await orpc.project.list() // Direct server call
      return <ProjectList initialData={data} />
    }
    ```

*   **Client Components:**
    Use the query hooks provided by the oRPC React client.
    ```tsx
    // ✅ Correct: Client-side mutation
    'use client'
    import { useORPC } from '@/lib/orpc/client'
    
    export function SaveButton() {
      const { mutate } = useORPC().project.create.useMutation()
      // ...
    }
    ```

## 2. Folder Organization (Suggestion)

**Recommended structure** - adapts to project needs:
*   **Package Manager:** Detect `bun.lockb` (Bun), `package-lock.json` (npm), etc. **ALWAYS** use the detected manager commands. Never mix them.

```text
app/
├── (auth)/              # Route group for auth pages
├── (protected)/         # Route group for authenticated routes
│   ├── dashboard/
│   ├── settings/
│   ├── components/      # Route-specific components
│   └── lib/             # Route-specific utils/types
├── actions/             # Server Actions (global)
├── api/                 # API routes
components/              # Shared components
├── ui/                  # shadcn primitives
└── shared/              # Business components
hooks/                   # Custom React hooks
lib/                     # Shared utilities
├── orpc/                # THE DATA LAYER
│   ├── routers/         # Domain logic (admin.ts, project.ts, etc.)
│   ├── root.ts          # Root router definition
│   ├── procedures.ts    # Middleware & Base procedures
│   ├── client.ts        # React Query Client
│   └── rsc-client.ts    # Server Component Client
data/                    # Database queries
ai/                      # AI logic (tools, agents, prompts)
```

**Check for:**
- AI logic outside `/ai` folder (should be in `/ai`)
- If Route-specific components in global `/components` then move to route folder's component
- Route groups "()" used appropriately for logical sections
- No API Magic: Logic should not exist in `app/api/...` unless it is a webhook (Stripe) or the main `api/rpc` handler.

## 3. Supabase & Data Architecture (via oRPC)
**Trigger Skills or Powers:** `/nextjs-supabase-auth`, `/supabase-postgres-best-practices`, `/cache-components`, `/orpc-contract-first`

* Role of Supabase: Supabase is strictly the Database & Auth Provider. It should NOT be called directly from UI components (Page/Layout/Client Component).
* **Access Pattern**:
  * **Allowed**: `lib/orpc/context.ts` (Middleware), `lib/orpc/routers/*.ts` (Procedures).
  * **Forbidden**: calling supabase.from(...) inside app/**/*.tsx`.
  * **Fetch Pattern (Read)**: 

    Instead of direct queries, define a Query Procedure.

    ```ts
    // 1. Define in lib/orpc/routers/user.ts
    export const userParams = z.object({ id: z.string() });

    // Procedure logic handles the DB call
    export const getProfile = publicProcedure
      .input(userParams)
      .query(async ({ ctx, input }) => {
        return ctx.db.from('profiles').select('*').eq('id', input.id).single();
      });

    // 2. Consume in Server Component (app/page.tsx)
    import { orpc } from '@/lib/orpc/rsc-client';

    export default async function Page({ params }: { params: Promise<{ id: string }> }) {
      const { id } = await params;
      const profile = await orpc.user.getProfile({ id }); // Type-safe!
      return <ProfileView data={profile} />;
    }
    ```
  * **Mutation Pattern (Write)**:

    Instead of FormData server actions, use Mutation Procedures.

    ```ts
    // 1. Define in lib/orpc/routers/user.ts
    export const updateProfileSchema = z.object({ 
      id: z.string(), 
      name: z.string().min(2) 
    });

    export const updateProfile = protectedProcedure // Auto-checks auth
      .input(updateProfileSchema)
      .mutation(async ({ ctx, input }) => {
        const { error } = await ctx.db.from('profiles').update({ name: input.name }).eq('id', input.id);
        if (error) throw new Error(error.message);
        // Cache invalidation happens here if needed
      });
      
    // 2. Consume in Client Component
    'use client'
    import { useORPC } from '@/lib/orpc/client';

    export function SaveButton({ id }) {
      const { mutate } = useORPC().user.updateProfile.useMutation();
      
      return <button onClick={() => mutate({ id, name: "New Name" })}>Save</button>;
    }
    ```

## 4. Security & Validation
**Trigger Skills or Powers:** `/api-security-best-practices`, `/security-reviewer`

*   **Input Validation:** ALL oRPC procedures MUST have a `.input(z.object(...))` schema.
*   **Authorization:** 
    *   Use `publicProcedure` for open endpoints.
    *   Use `protectedProcedure` (or authenticated middleware) for everything else.
    *   Check specific permissions (RBAC) inside the procedure logic if needed.

*   **Rate Limiting:** Implement rate limiting in the `api/rpc` route handler if required.

## 5. Next.js 16 Breaking Changes & Async Patterns
Rule: `params` and `searchParams` are Promises. They MUST be awaited.
  ```tsx
  // ✅ Correct (Next.js 16)
  export default async function Page({
    params
  }: {
    params: Promise<{ id: string }>
  }) {
    const { id } = await params
    
    // Example: Fetching via oRPC using the awaited ID
    const project = await orpc.project.get({ id })
    
    return <div>{project.name}</div>
  }
  ```

## 6. UI & Styling Standards (Shadcn UI)

* Trigger  or Powers: `/nextjs-shadcn`
* **Theming**: Rely on CSS Variables `(var(--primary))` in `globals.css`.
* **Glassmorphism**: Use use Tailwind utilities: `bg-background/60 backdrop-blur-md border border-border/50` for the glass look, if asked.
**Components**: Logic belongs in `components/`, page files should strictly compose components and fetch data via oRPC.

## 7. Client Component Usage

* "use client" goes at the leaf node possible.
* **Mutations**: All write operations (Create, Update, Delete) must happen via oRPC Mutations in Client Components or Server Actions (only if necessary for progressive enhancement).
* State: Use `useTransition` when triggering specific UI updates that might block.

## 8. AI Feature Implementation
*   **Provider Agnostic:** Do not hardcode "OpenAI" or "Anthropic" unless explicitly requested. Use environment variables for `LLM_PROVIDER` and `LLM_MODEL`.
*   **Context:** Ask user for preference (Anthropic, OpenRouter, etc.) before scaffolding AI logic.
*   Context: AI Agents should be exposed via oRPC procedures (e.g., orpc.ai.generateResponse) rather than direct API routes, allowing type-safe streaming where supported.

## 9. Using Next.js Documentation (MCP)

When `next-devtools` MCP is available, use it to verify patterns against official docs:

### Available MCP Tools

- `mcp__next-devtools__nextjs_docs` - Fetch official Next.js documentation by path
- `mcp__next-devtools__nextjs_index` - Discover running Next.js dev servers
- `mcp__next-devtools__nextjs_call` - Call Next.js MCP tools (get_errors, etc.)

### When to Use MCP
1. **Verify Server Component rules** - `Fetch /docs/app/getting-started/`server-and-client-components
2. **Validate Layout patterns** - Fetch `/docs/app/getting-started/layouts-and-pages`
3. **Check oRPC Integration** - (Since oRPC is 3rd party, rely on the `lib/orpc` files in the project for context).

## Notes
* **Context Awareness**: If I ask for a feature, search `lib/orpc/routers` first. If a procedure doesn't exist, propose the Zod schema and Procedure before writing the UI.
* **Refactoring**: If you see `fetch('/api/...')`in the codebase, flag it as a violation and suggest refactoring to oRPC.


