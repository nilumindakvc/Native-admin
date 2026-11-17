import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge, Loading, ErrorBanner, EmptyState, Pagination } from "../components/ui";

const LIMIT = 20;
const STATUSES = ["active", "inactive", "hidden"];

export default function Listings() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);

  const params = {
    listing_status: statusFilter || undefined,
    q: query || undefined,
    limit: LIMIT,
    offset,
  };

  const listings = useQuery({
    queryKey: ["listings", params],
    queryFn: () => api.get("/admin/listings", params),
    placeholderData: keepPreviousData,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/listings/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  function applySearch(e) {
    e.preventDefault();
    setOffset(0);
    setQuery(search.trim());
  }

  function money(l) {
    if (l.price == null) return "—";
    return `${l.currency} ${Number(l.price).toLocaleString()}`;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Listings</h1>
        <p className="text-sm text-slate-500">Monitor and moderate product & service listings.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setOffset(0);
              setStatusFilter(e.target.value);
            }}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={applySearch} className="flex items-end gap-2">
          <div>
            <label className="label">Search title</label>
            <input
              className="input"
              placeholder="Listing title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      {listings.isError && <ErrorBanner message={listings.error.message} onRetry={listings.refetch} />}
      {setStatus.isError && <ErrorBanner message={setStatus.error.message} />}

      <div className="card overflow-hidden">
        {listings.isLoading ? (
          <Loading />
        ) : listings.data && listings.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Title</th>
                    <th className="th">Type</th>
                    <th className="th">Kind</th>
                    <th className="th">Price</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Moderate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listings.data.items.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="td">
                        <p className="max-w-xs truncate font-medium text-slate-800" title={l.title}>
                          {l.title}
                        </p>
                        <p className="text-xs text-slate-400">{l.location || "No location"}</p>
                      </td>
                      <td className="td">
                        <Badge value={l.listing_type} />
                      </td>
                      <td className="td text-slate-500">{l.listing_kind.replace(/_/g, " ")}</td>
                      <td className="td">{money(l)}</td>
                      <td className="td">
                        <Badge value={l.status} />
                      </td>
                      <td className="td">
                        <div className="flex justify-end">
                          <select
                            className="input !w-32 !py-1"
                            value={l.status}
                            onChange={(e) => setStatus.mutate({ id: l.id, status: e.target.value })}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={listings.data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        ) : (
          <EmptyState title="No listings found" description="Try a different filter." />
        )}
      </div>
    </div>
  );
}
