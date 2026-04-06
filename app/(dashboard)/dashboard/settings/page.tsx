// app/(dashboard)/dashboard/settings/page.tsx

import { createClient } from '@/app/lib/supabase/server'
import { UserSettingsForm } from '@/app/(dashboard)/_components/user-settings-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'

export default async function SettingPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const rpc = await getRPCCaller()
  const data = await rpc.user.getSettings()

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
      <div className='flex items-center justify-between'>
        <div className='grid gap-1'>
          <h1 className='text-3xl md:text-4xl'>Settings</h1>
          <p className='text-lg text-muted-foreground'>Your Profile settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Data</CardTitle>
          <CardDescription>
            Please provide general information about yourself. Please dont
            forget to save
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-3'>
          <UserSettingsForm 
            defaultName={data?.name ?? null}
            defaultEmail={data?.email ?? ''}
            defaultColorScheme={data?.colorScheme ?? null}
          />
        </CardContent>
      </Card>
    </div>
  )
}
