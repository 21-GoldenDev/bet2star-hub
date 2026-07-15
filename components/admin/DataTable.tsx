"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  searchPlaceholder?: string;
  searchKey?: keyof T;
  itemsPerPage?: number;
  actions?: (row: T) => React.ReactNode;
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  title,
  searchPlaceholder = "Search...",
  searchKey,
  itemsPerPage = 10,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter data
  let filteredData = data;
  if (search && searchKey) {
    filteredData = data.filter((item) => {
      const value = String(item[searchKey]).toLowerCase();
      return value.includes(search.toLowerCase());
    });
  }

  // Sort data
  if (sortKey) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }

  // Paginate data
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [] as Array<number | "ellipsis">;

    const siblingCount = 2;
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);

    for (let page = safePage - siblingCount; page <= safePage + siblingCount; page += 1) {
      if (page >= 1 && page <= totalPages) pages.add(page);
    }

    // Prefer showing the first few pages when near the start (matches « ‹ 1 2 3 4 5 … N »)
    if (safePage <= siblingCount + 2) {
      for (let page = 1; page <= Math.min(5, totalPages); page += 1) {
        pages.add(page);
      }
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const items: Array<number | "ellipsis"> = [];

    sorted.forEach((page, index) => {
      if (index > 0 && page - sorted[index - 1] > 1) {
        items.push("ellipsis");
      }
      items.push(page);
    });

    return items;
  }, [safePage, totalPages]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-bold">{title}</h2>}

      {searchKey && (
        <div className="flex items-center gap-2 bg-card p-4 rounded-lg border border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  onClick={() =>
                    column.sortable && handleSort(column.key)
                  }
                  className={column.sortable ? "cursor-pointer hover:bg-accent" : ""}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortKey === column.key && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center text-muted-foreground py-8"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow key={row.id || idx}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key])}
                    </TableCell>
                  ))}
                  {actions && <TableCell>{actions(row)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages} ({filteredData.length} results)
          </p>
          <nav aria-label="Pagination" className="inline-flex items-center overflow-hidden rounded-md border border-border">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-none border-r border-border px-0"
              onClick={() => goToPage(1)}
              disabled={safePage === 1}
              aria-label="First page"
            >
              <ChevronFirst className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-none border-r border-border px-0"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 min-w-9 items-center justify-center border-r border-border px-2 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 min-w-9 rounded-none border-r border-border px-3",
                    item === safePage &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                  )}
                  onClick={() => goToPage(item)}
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-none border-r border-border px-0"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-none px-0"
              onClick={() => goToPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Last page"
            >
              <ChevronLast className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
