// app/(super-admin)/_components/user-table-toolbar.tsx

'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

export function UserTableToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  
  // Local state for immediate input feedback
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

  // Helper to update URL
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      
      // Reset to page 1 when filter changes
      if (name !== 'page') {
        params.set('page', '1');
      }
      
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = (term: string) => {
    setSearchValue(term);
    
    // Debounce the router push
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set('q', term);
      } else {
        params.delete('q');
      }
      params.set('page', '1'); // Reset page
      router.replace(`?${params.toString()}`);
    });
  };

  const handleLimitChange = (value: string) => {
    router.push(`?${createQueryString('limit', value)}`);
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page</span>
        <Select 
          value={searchParams.get('limit') || '10'} 
          onValueChange={handleLimitChange}
        >
          <SelectTrigger className="h-9 w-[70px]">
            <SelectValue placeholder="10" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
