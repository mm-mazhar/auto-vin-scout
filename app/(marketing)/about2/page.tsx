// app/(marketing)/about2/page.tsx
'use client'

import { PageSection } from '@/components/page-section'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <PageSection>
      <div className='px-4'>
        <div className='flex flex-col items-center justify-center gap-10 md:flex-row'>
          <div className='relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/40 shrink-0'>
            <Image
              className='max-w-md w-full object-cover rounded-2xl'
              src='https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?q=80&w=800&auto=format&fit=crop'
              alt='Team'
              width={800}
              height={533}
              unoptimized
            />
            <div className='flex items-center gap-2 max-w-72 absolute bottom-8 left-8 bg-background p-4 rounded-xl'>
              <div className='flex -space-x-4 shrink-0'>
                <Image src='https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200' alt='Avatar 1' className='size-9 rounded-full border-[3px] border-background' width={36} height={36} unoptimized />
                <Image src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200' alt='Avatar 2' className='size-9 rounded-full border-[3px] border-background' width={36} height={36} unoptimized />
                <Image src='https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop' alt='Avatar 3' className='size-9 rounded-full border-[3px] border-background' width={36} height={36} unoptimized />
                {/* <div className='flex items-center justify-center text-xs text-primary-foreground size-9 rounded-full border-[3px] border-background bg-primary'>
                  50+
                </div> */}
              </div>
              <p className='text-sm font-medium text-foreground'>Unlock Your Productivity</p>
            </div>
          </div>

          <div className='text-sm text-muted-foreground max-w-lg'>
            <h1 className='text-xl uppercase font-semibold text-foreground'>What we do?</h1>
            <div className='w-24 h-[3px] rounded-full bg-gradient-to-r from-primary to-primary/30'></div>
            <p className='mt-4'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum, iste obcaecati. Nemo sint deleniti a porro eos enim! A, doloremque?</p>
            <p className='mt-4'>Lorem ipsum dolor sit.0</p>
            <p className='mt-4'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nam porro modi, officiis quia inventore blanditiis veritatis error quisquam eius, praesentium magnam recusandae minus ducimus impedit quaerat cumque laborum tenetur velit!</p>
            <p className='mt-4'>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ipsam iste perspiciatis reiciendis illum tenetur facilis, tempora sed ipsa explicabo nemo debitis quidem illo commodi earum porro eius maiores, dolorum ullam odit? Obcaecati accusantium neque quidem placeat? Unde rerum vel, nobis velit ducimus pariatur maxime, nemo minus tenetur saepe rem blanditiis nulla est aliquam sequi voluptates laborum quia temporibus consectetur eligendi doloribus laudantium cumque impedit? Optio rerum quaerat perferendis voluptatum, id pariatur quia veritatis architecto minima vero excepturi fuga doloribus, cum quo laborum eum, quibusdam unde porro deserunt voluptas tenetur consequuntur libero. Aliquam sed expedita deserunt atque aperiam ad laudantium amet, ullam nam alias omnis magnam nemo a eos rerum. Animi, ipsa. Sed tempore eum, tenetur odio voluptatibus debitis libero quas alias. Tempore tenetur ipsa neque nobis perspiciatis, delectus consectetur unde quas nostrum dolorum rem consequuntur esse alias, minima distinctio, molestias voluptate deserunt odit! Enim officiis voluptates at ea reiciendis. Vel hic molestias consequuntur eos dignissimos labore architecto accusamus nemo! Dolorum aspernatur tempore esse assumenda earum perferendis reprehenderit? Hic enim vero exercitationem asperiores dolor dolores, rem nostrum est distinctio voluptas consequatur repellendus beatae officiis fugiat corrupti voluptate deleniti minus. Voluptate unde id excepturi. Minima velit fugit eveniet ea blanditiis animi maiores.</p>
          </div>
        </div>
      </div>
    </PageSection>
  )
}
