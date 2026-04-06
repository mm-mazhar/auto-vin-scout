// app/auth/auth-code-error/page.tsx

import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold mb-4'>Authentication Error</h1>
        {/*
          2. Use double quotes for the text so the apostrophe in "couldn't" is valid.
        */}
        <p className='text-muted-foreground mb-4'>
          Sorry, we could not complete the authentication process.
        </p>
        {/*
          3. Replace the <a> tag with the <Link> component.
             The 'href' prop works exactly the same.
        */}
        <Link href='/' className='text-primary hover:underline'>
          Return to home
        </Link>
      </div>
    </div>
  )
}
