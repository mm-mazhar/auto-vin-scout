// app/(dashboard)/_components/listing-history-table.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VehicleListingHistory } from '@prisma/client'

interface ListingHistoryTableProps {
  listings: VehicleListingHistory[]
}

export function ListingHistoryTable({ listings }: ListingHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Listing Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Price</th>
                <th className="py-2 px-3">Miles</th>
                <th className="py-2 px-3">Seller</th>
                <th className="py-2 px-3">Location</th>
                <th className="py-2 px-3">Seller Type</th>
                <th className="py-2 px-3">Inventory Type</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b border-border/50">
                  <td className="py-2 px-3">
                    {listing.statusDate
                      ? new Date(listing.statusDate).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="py-2 px-3">
                    {listing.price !== null ? `$${listing.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2 px-3">
                    {listing.miles !== null ? `${listing.miles.toLocaleString()} mi` : '—'}
                  </td>
                  <td className="py-2 px-3">{listing.sellerName ?? '—'}</td>
                  <td className="py-2 px-3">
                    {[listing.city, listing.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="py-2 px-3">
                    <span className="capitalize">{listing.sellerType ?? '—'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="capitalize">{listing.inventoryType ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
