import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge, Loading, ErrorBanner, EmptyState, Pagination } from "../components/ui";
import { Modal, ConfirmDialog } from "../components/Modal";

const LIMIT = 20;
const STATUSES = ["", "pending", "approved", "rejected"];

export default function Sellers() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const params = {
    approval_status: statusFilter || undefined,
    q: query || undefined,
    limit: LIMIT,
    offset,
  };

  const sellers = useQuery({
    queryKey: ["sellers", params],
    queryFn: () => api.get("/admin/sellers", params),
    placeholderData: keepPreviousData,
  });

  const approve = useMutation({
    mutationFn: (id) => api.post(`/admin/sellers/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setApproveTarget(null);
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/admin/sellers/${id}/reject`, { reason: reason || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setRejectTarget(null);
      setRejectReason("");
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
        <h1 className="text-2xl font-semibold text-slate-800">Sellers</h1>
        <p className="text-sm text-slate-500">Review registrations and manage seller accounts.</p>
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
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "All" : s}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={applySearch} className="flex items-end gap-2">
          <div>
            <label className="label">Search business</label>
            <input
              className="input"
              placeholder="Business name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      {sellers.isError && <ErrorBanner message={sellers.error.message} onRetry={sellers.refetch} />}
      {(approve.isError || reject.isError) && (
        <ErrorBanner message={(approve.error || reject.error)?.message} />
      )}

      <div className="card overflow-hidden">
        {sellers.isLoading ? (
          <Loading />
        ) : sellers.data && sellers.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Business</th>
                    <th className="th">Location</th>
                    <th className="th">Status</th>
                    <th className="th">Registered</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellers.data.items.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="td">
                        <p className="font-medium text-slate-800">{s.business_name}</p>
                        {s.contact_phone && (
                          <p className="text-xs text-slate-400">{s.contact_phone}</p>
                        )}
                      </td>
                      <td className="td">{s.location || "—"}</td>
                      <td className="td">
                        <Badge value={s.approval_status} />
                        {s.approval_status === "rejected" && s.rejection_reason && (
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-400" title={s.rejection_reason}>
                            {s.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="td text-slate-500">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          {s.approval_status !== "approved" && (
                            <button className="btn-primary" onClick={() => setApproveTarget(s)}>
                              Approve
                            </button>
                          )}
                          {s.approval_status !== "rejected" && (
                            <button className="btn-danger" onClick={() => setRejectTarget(s)}>
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={sellers.data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        ) : (
          <EmptyState title="No sellers found" description="Try a different filter." />
        )}
      </div>

      <ConfirmDialog
        open={!!approveTarget}
        title="Approve seller"
        message={`Approve "${approveTarget?.business_name}"? They will be able to publish listings.`}
        confirmLabel="Approve"
        busy={approve.isPending}
        onConfirm={() => approve.mutate(approveTarget.id)}
        onClose={() => setApproveTarget(null)}
      />

      <Modal
        open={!!rejectTarget}
        title="Reject seller"
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRejectTarget(null)} disabled={reject.isPending}>
              Cancel
            </button>
            <button
              className="btn-danger"
              disabled={reject.isPending}
              onClick={() => reject.mutate({ id: rejectTarget.id, reason: rejectReason })}
            >
              {reject.isPending ? "Working…" : "Reject"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Rejecting <span className="font-medium">{rejectTarget?.business_name}</span>. Optionally give a reason.
        </p>
        <textarea
          className="input min-h-[90px]"
          placeholder="Reason (optional)…"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
