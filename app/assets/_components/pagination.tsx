// app/assets/_components/pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function Pagination({ currentPage, totalCount, pageSize, currentParams }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-navy-300">
      <div>
        Showing <span className="font-medium text-navy-50">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}</span> to <span className="font-medium text-navy-50">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-medium text-navy-50">{totalCount}</span>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded bg-navy-800 border border-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <span className="px-4 py-2 bg-navy-800 border border-navy-600 rounded">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded bg-navy-800 border border-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}