// app/(super-admin)/_components/data-pagination.tsx

'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  total: number;
  currentPage: number;
  limit: number;
}

export function DataPagination({ total, currentPage, limit }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);
  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, total);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-xs text-muted-foreground">
        Showing <strong>{start}-{end}</strong> of <strong>{total}</strong>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}