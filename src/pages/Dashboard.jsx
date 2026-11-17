import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { StatCard, Loading, ErrorBanner, Badge, EmptyState } from "../components/ui";

async function fetchStats() {
  const [pendingSellers, allSellers, users, listings, hiddenListings] = await Promise.all([
    api.get("/admin/sellers", { approval_status: "pending", limit: 1 }),
    api.get("/admin/sellers", { limit: 1 }),
    api.get("/admin/users", { limit: 1 }),
    api.get("/admin/listings", { limit: 1 }),
    api.get("/admin/listings", { listing_status: "hidden", limit: 1 }),
  ]);
  return {
    pendingSellers: pendingSellers.total,
    allSellers: allSellers.total,
    users: users.total,
    listings: listings.total,
    hiddenListings: hiddenListings.total,
  };
}

export default function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const pending = useQuery({
    queryKey: ["sellers", { approval_status: "pending", limit: 5, offset: 0 }],
    queryFn: () => api.get("/admin/sellers", { approval_status: "pending", limit: 5, offset: 0 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of the marketplace.</p>
      </div>

      {stats.isError && <ErrorBanner message={stats.error.message} onRetry={stats.refetch} />}

      {stats.isLoading ? (
        <Loading />
      ) : stats.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Pending approvals"
            value={stats.data.pendingSellers}
            accent="text-amber-600"
            hint="Sellers awaiting review"
          />
          <StatCard label="Total sellers" value={stats.data.allSellers} />
          <StatCard label="Total users" value={stats.data.users} />
          <StatCard label="Listings" value={stats.data.listings} />
          <StatCard
            label="Hidden listings"
            value={stats.data.hiddenListings}
            accent="text-red-600"
          />
        </div>
      ) : null}

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Sellers awaiting approval</h2>
          <Link to="/sellers" className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {pending.isLoading ? (
          <Loading />
        ) : pending.data && pending.data.items.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {pending.data.items.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.business_name}</p>
                  <p className="text-xs text-slate-400">{s.location || "No location"}</p>
                </div>
                <Badge value={s.approval_status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No pending sellers" description="New seller registrations will show here." />
        )}
      </div>
    </div>
  );
}
