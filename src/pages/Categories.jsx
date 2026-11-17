import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge, Loading, ErrorBanner, EmptyState } from "../components/ui";
import { Modal, ConfirmDialog } from "../components/Modal";

const DOMAINS = [
  { key: "product", label: "Products", path: "products" },
  { key: "service", label: "Services", path: "services" },
];

function emptyForm(kind) {
  return { kind, id: null, name: "", slug: "", description: "", image_url: "", major_id: "", is_active: true };
}

export default function Categories() {
  const qc = useQueryClient();
  const [domain, setDomain] = useState("product");
  const [form, setForm] = useState(null); // modal form state
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, id, name }

  const domainMeta = DOMAINS.find((d) => d.key === domain);

  const majors = useQuery({
    queryKey: ["categories", domain, "major"],
    queryFn: () => api.get(`/categories/${domainMeta.path}/major`, { active_only: false }),
  });
  const subs = useQuery({
    queryKey: ["categories", domain, "sub"],
    queryFn: () => api.get(`/categories/${domainMeta.path}/sub`, { active_only: false }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories", domain] });

  const save = useMutation({
    mutationFn: ({ kind, id, body }) => {
      const base = `/admin/categories/${domain}/${kind}`;
      return id ? api.patch(`${base}/${id}`, body) : api.post(base, body);
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
  });

  const remove = useMutation({
    mutationFn: ({ kind, id }) => api.del(`/admin/categories/${domain}/${kind}/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  function majorName(id) {
    return majors.data?.find((m) => m.id === id)?.name || "—";
  }

  function submitForm(e) {
    e.preventDefault();
    const body = {
      name: form.name,
      description: form.description || null,
      is_active: form.is_active,
    };
    if (form.slug.trim()) body.slug = form.slug.trim();
    if (form.kind === "major") body.image_url = form.image_url || null;
    if (form.kind === "sub") body.major_id = form.major_id;
    save.mutate({ kind: form.kind, id: form.id, body });
  }

  function editRow(kind, row) {
    setForm({
      kind,
      id: row.id,
      name: row.name,
      slug: row.slug || "",
      description: row.description || "",
      image_url: row.image_url || "",
      major_id: row.major_id || "",
      is_active: row.is_active,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500">Manage product and service categories.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {DOMAINS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDomain(d.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                domain === d.key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {(save.isError || remove.isError) && (
        <ErrorBanner message={(save.error || remove.error)?.message} />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Majors */}
        <CategoryCard
          title="Major categories"
          onAdd={() => setForm(emptyForm("major"))}
          query={majors}
          renderRow={(m) => (
            <Row
              key={m.id}
              title={m.name}
              subtitle={m.slug}
              active={m.is_active}
              onEdit={() => editRow("major", m)}
              onDelete={() => setDeleteTarget({ kind: "major", id: m.id, name: m.name })}
            />
          )}
        />

        {/* Subs */}
        <CategoryCard
          title="Sub categories"
          onAdd={() =>
            majors.data?.length
              ? setForm(emptyForm("sub"))
              : alert("Create a major category first.")
          }
          query={subs}
          renderRow={(s) => (
            <Row
              key={s.id}
              title={s.name}
              subtitle={`${majorName(s.major_id)} · ${s.slug}`}
              active={s.is_active}
              onEdit={() => editRow("sub", s)}
              onDelete={() => setDeleteTarget({ kind: "sub", id: s.id, name: s.name })}
            />
          )}
        />
      </div>

      {/* Create / edit modal */}
      <Modal
        open={!!form}
        title={`${form?.id ? "Edit" : "New"} ${form?.kind} category`}
        onClose={() => setForm(null)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setForm(null)} disabled={save.isPending}>
              Cancel
            </button>
            <button className="btn-primary" form="category-form" type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {form && (
          <form id="category-form" onSubmit={submitForm} className="space-y-4">
            {form.kind === "sub" && (
              <div>
                <label className="label">Parent major category</label>
                <select
                  className="input"
                  value={form.major_id}
                  onChange={(e) => setForm({ ...form, major_id: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {majors.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Slug (optional)</label>
              <input
                className="input"
                placeholder="auto-generated from name"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input min-h-[70px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {form.kind === "major" && (
              <div>
                <label className="label">Image URL (optional)</label>
                <input
                  className="input"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        danger
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CategoryCard({ title, onAdd, query, renderRow }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <button className="btn-primary" onClick={onAdd}>
          + Add
        </button>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorBanner message={query.error.message} onRetry={query.refetch} />
      ) : query.data?.length || query.data?.items?.length ? (
        <ul className="divide-y divide-slate-100">
          {(query.data.items || query.data).map(renderRow)}
        </ul>
      ) : (
        <EmptyState title="None yet" description="Add the first one." />
      )}
    </div>
  );
}

function Row({ title, subtitle, active, onEdit, onDelete }) {
  return (
    <li className="flex items-center justify-between px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{title}</p>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {!active && <Badge value="inactive" />}
        <button className="btn-ghost" onClick={onEdit}>
          Edit
        </button>
        <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}
