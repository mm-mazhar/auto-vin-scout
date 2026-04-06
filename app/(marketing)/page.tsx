// app/(marketing)/page.tsx
 

import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
// import { HeroHeader } from '@/components/header'
// import  HeroSection from '@/components/hero-section'
import HeroSection from '@/app/(marketing)/_components/hero-section'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user data from database if logged in
  const data = user ? await getData(user.id) : null

  //   return (
  //     <section className='flex items-center justify-center bg-background h-[90vh]'>
  //       <div className='relative items-center w-full px-5 mx-auto md:px-12 lg:px-16 max-w-7xl'>
  //         {user ? (
  //           // --- LAYOUT FOR LOGGED-IN USERS (SINGLE CENTERED COLUMN) ---
  //           <div className='max-w-xl mx-auto text-center'>
  //             <h1 className='mt-8 text-3xl font-extrabold tracking-tight lg:text-6xl'>
  //               Welcome!
  //             </h1>
  //             <p className='max-w-xl mx-auto mt-8 text-base lg:text-xl text-secondary-foreground'>
  //               You are logged in. You can now access your dashboard.
  //             </p>
  //             <div className='flex justify-center max-w-sm mx-auto mt-10'>
  //               <Link href='/dashboard'>
  //                 <Button size='lg' className='w-full'>
  //                   Go to Dashboard
  //                 </Button>
  //               </Link>
  //             </div>
  //           </div>
  //         ) : (
  //           <>
  //             {/* <HeroHeader /> */}
  //             {/* --- LAYOUT FOR NEW VISITORS (TWO-COLUMN GRID) --- */}
  //             {/* <div className='relative flex-col items-start m-auto align-middle'>
  //               <div className='grid grid-cols-1 gap-6 lg:gap-24 lg:grid-cols-2'>
  //                 <div className='relative items-center gap-12 m-auto lg:inline-flex md:order-first'>
  //                   <div className='max-w-xl mx-auto text-center lg:text-left'>
  //                     <span className='w-auto px-6 py-3 rounded-full bg-secondary'>
  //                       <span className='text-sm font-medium text-primary'>
  //                         {APP_SLOGAN}
  //                       </span>
  //                     </span>
  //                     <h1 className='mt-8 text-3xl font-extrabold tracking-tight lg:text-6xl'>
  //                       {APP_DESCRIPTION}
  //                     </h1>
  //                     <p className='max-w-xl mx-auto mt-8 text-base lg:text-xl text-secondary-foreground lg:mx-0'>
  //                       {APP_DESCRIPTION_LONG}
  //                     </p>
  //                     <div className='flex justify-center max-w-sm mx-auto mt-10 lg:justify-start lg:mx-0'>
  //                       <Link href='/get-started'>
  //                         <Button size='lg' className='w-full'>
  //                           Get Started
  //                         </Button>
  //                       </Link>
  //                     </div>
  //                   </div>
  //                 </div>
  //                 <div className='order-first block w-full mt-12 aspect-square lg:mt-0'>
  //                 </div>
  //               </div>
  //             </div> */}
  //             {/* Your hero image/illustration goes here */}
  //             <HeroSection />
  //           </>
  //         )}
  //       </div>
  //     </section>
  //   )
  // }

  return <HeroSection />
}
