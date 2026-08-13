import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import { Alert, Confirm, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { cached, invalidate, KEYS, signalFirstPaint } from "../../lib/prefetch";

export default function EmployeesPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [listReady, setListReady] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmDel, setConfirmDel] = useState(null);
  const [busy, setBusy] = useState(false);

  // This is the console's landing page, so it loads on its own — nothing else
  // is requested until it has painted (see lib/prefetch.js).
  const load = useCallback(() => {
    setLoading(true);
    api
      .listEmployees({
        q,
        department,
        status_filter: statusFilter,
        page,
        page_size: 25,
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setListReady(true);
        // Employees are on screen — release the background warm-up queue.
        signalFirstPaint();
      });
  }, [q, department, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Deliberately NOT fetched on mount: the employee list must own the network
  // until it has painted. Once it has, this shares the warm-up's request for
  // the same key (cached() dedupes), so the dropdown fills with no extra call.
  useEffect(() => {
    if (!listReady) return;
    cached(KEYS.departments, () => api.departments())
      .then(setDepartments)
      .catch(() => {});
  }, [listReady]);

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteEmployee(confirmDel.uid);
      setNotice(`Deleted ${confirmDel.name} (${confirmDel.uid})`);
      setConfirmDel(null);
      // That may have removed the last member of a department.
      invalidate(KEYS.departments);
      load();
    } catch (e) {
      setError(e.message);
      setConfirmDel(null);
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Employees &amp; badges</div>
            <div className="small muted">
              {data.total} record(s). These are the trained staff — not console
              logins.
            </div>
          </div>
          <Link className="btn primary" to="/admin/employees/new">
            <Icon name="plus" /> New employee
          </Link>
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search name, badge ID, employee ID…"
            style={{ flex: 1, minWidth: 200 }}
          />
          <select
            value={department}
            onChange={(e) => {
              setPage(1);
              setDepartment(e.target.value);
            }}
            style={{ width: 190 }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            style={{ width: 150 }}
          >
            <option value="">Any status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {loading ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <div className="empty">
            No employees match. <Link to="/admin/employees/new">Add one</Link>.
          </div>
        ) : (
          <>
            {/* desktop / tablet: table */}
            <div className="table-wrap dtable">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span style={{ fontWeight: 550 }}>{e.name}</span>
                        {!e.is_active && (
                          <span className="pill unknown" style={{ marginLeft: 8 }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="mono">{e.employee_id}</td>
                      <td>{e.department || "—"}</td>
                      <td className="actions">
                        <Link
                          className="btn sm ghost"
                          to={`/admin/employees/${e.uid}/badge`}
                          title="Badge / QR code"
                        >
                          <Icon name="qrcode" />{" "}
                          <span className="btn-label">Badge</span>
                        </Link>{" "}
                        <Link
                          className="btn sm ghost"
                          to={`/admin/employees/${e.uid}/edit`}
                          title="Edit employee"
                        >
                          <Icon name="edit" />{" "}
                          <span className="btn-label">Edit</span>
                        </Link>{" "}
                        <button
                          className="btn sm danger"
                          onClick={() => setConfirmDel(e)}
                          title="Delete employee"
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile: cards */}
            <div className="mlist">
              {data.items.map((e) => (
                <div className="mcard" key={e.id}>
                  <div className="mcard-head">
                    <div className="mcard-title">
                      {e.name}
                      <span className="sub mono">{e.employee_id}</span>
                    </div>
                    <span className={`pill ${e.is_active ? "valid" : "unknown"}`}>
                      {e.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mcard-rows">
                    <div className="r">
                      <span>Department</span>
                      <span>{e.department || "—"}</span>
                    </div>
                  </div>
                  <div className="mcard-actions">
                    <Link
                      className="btn sm ghost"
                      to={`/admin/employees/${e.uid}/badge`}
                    >
                      <Icon name="qrcode" /> Badge
                    </Link>
                    <Link
                      className="btn sm ghost"
                      to={`/admin/employees/${e.uid}/edit`}
                    >
                      <Icon name="edit" /> Edit
                    </Link>
                    <button
                      className="btn sm danger"
                      onClick={() => setConfirmDel(e)}
                    >
                      <Icon name="trash" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {pages > 1 && (
          <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
            <button
              className="btn sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <Icon name="chevron-left" /> Prev
            </button>
            <span className="small muted">
              Page {data.page} of {pages}
            </span>
            <button
              className="btn sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <Icon name="chevron-right" />
            </button>
          </div>
        )}
      </div>

      <Confirm
        open={Boolean(confirmDel)}
        title="Delete employee?"
        message={`${confirmDel?.name} (${confirmDel?.uid}) and all their training records will be permanently removed. Their badge QR will stop working.`}
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
        busy={busy}
      />
    </>
  );
}
