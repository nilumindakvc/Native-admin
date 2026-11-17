import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge, Loading, ErrorBanner, EmptyState, Pagination } from "../components/ui";
import { ConfirmDialog } from "../components/Modal";

const LIMIT = 20;
const ROLES = ["customer", "seller", "admin"];

export default function Users() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [toggleTarget, setToggleTarget] = useState(null);

  const params = {
    role: roleFilter || undefined,
    is_active: activeFilter === "" ? undefined : activeFilter,
    q: query || undefined,
    limit: LIMIT,
    offset,
  };

  const users = useQuery({
    queryKey: ["users", params],
    queryFn: () => api.get("/admin/users", params),
    placeholderData: keepPreviousData,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setToggleTarget(null);
    },
  });

  function applySearch(e) {
    e.preventDefault();
    setOffset(0);
    setQuery(search.trim());
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Users</h1>
        <p className="text-sm text-slate-500">Manage customer, seller and admin accounts.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Role</label>
          <select
            className="input"
            value={roleFilter}
            onChange={(e) => {
              setOffset(0);
              setRoleFilter(e.target.value);
            }}
          >
            <option value="">All</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={activeFilter}
            onChange={(e) => {
              setOffset(0);
              setActiveFilter(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </div>
        <form onSubmit={applySearch} className="flex items-end gap-2">
          <div>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      {users.isError && <ErrorBanner message={users.error.message} onRetry={users.refetch} />}
      {update.isError && <ErrorBanner message={update.error.message} />}

      <div className="card overflow-hidden">
        {users.isLoading ? (
          <Loading />
        ) : users.data && users.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">User</th>
                    <th className="th">Role</th>
                    <th className="th">Status</th>
                    <th className="th">Joined</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.data.items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="td">
                        <p className="font-medium text-slate-800">{u.full_name || "—"}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="td">
                        <select
                          className="input !w-32 !py-1"
                          value={u.role}
                          onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="td">
                        <Badge value={u.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="td text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="td">
                        <div className="flex justify-end">
                          <button
                            className={u.is_active ? "btn-danger" : "btn-primary"}
                            onClick={() => setToggleTarget(u)}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={users.data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        ) : (
          <EmptyState title="No users found" description="Try a different filter." />
        )}
      </div>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? "Deactivate account" : "Activate account"}
        message={
          toggleTarget?.is_active
            ? `Deactivate ${toggleTarget?.email}? They will be blocked from using the platform.`
            : `Re-activate ${toggleTarget?.email}?`
        }
        danger={toggleTarget?.is_active}
        confirmLabel={toggleTarget?.is_active ? "Deactivate" : "Activate"}
        busy={update.isPending}
        onConfirm={() => update.mutate({ id: toggleTarget.id, body: { is_active: !toggleTarget.is_active } })}
        onClose={() => setToggleTarget(null)}
      />
    </div>
  );
}
