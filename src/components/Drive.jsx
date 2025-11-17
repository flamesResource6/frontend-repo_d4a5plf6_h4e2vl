import { useEffect, useRef, useState } from "react";
import { Folder as FolderIcon, File as FileIcon, Plus, Upload, ArrowLeft, MoreVertical, Trash2, Pencil, Home, Download } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL || "";

function prettyBytes(num) {
  if (num === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  return `${(num / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export default function Drive() {
  const [items, setItems] = useState({ folders: [], files: [] });
  const [path, setPath] = useState([]); // array of { _id, name }
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const inputRef = useRef();

  const currentFolderId = path.length ? path[path.length - 1]._id : null;

  async function fetchItems(parentId) {
    setLoading(true);
    const res = await fetch(`${API}/drive/list${parentId ? `?parent_id=${parentId}` : ""}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  async function fetchBreadcrumbs(folderId) {
    if (!folderId) return setPath([]);
    const res = await fetch(`${API}/drive/breadcrumbs/${folderId}`);
    const data = await res.json();
    setPath(data.breadcrumbs);
  }

  useEffect(() => {
    fetchItems(null);
  }, []);

  function goHome() {
    setPath([]);
    fetchItems(null);
  }

  function openFolder(folder) {
    setPath((prev) => [...prev, { _id: folder._id, name: folder.name }]);
    fetchItems(folder._id);
  }

  async function createFolder(name) {
    const res = await fetch(`${API}/drive/folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id: currentFolderId }),
    });
    const data = await res.json();
    setItems((prev) => ({ ...prev, folders: [...prev.folders, data].sort((a,b)=>a.name.localeCompare(b.name)) }));
  }

  async function handleUpload(files) {
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      if (currentFolderId) form.append("parent_id", currentFolderId);
      await fetch(`${API}/drive/upload`, { method: "POST", body: form });
    }
    fetchItems(currentFolderId);
  }

  async function doRename() {
    if (!renameItem) return;
    const res = await fetch(`${API}/drive/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(renameItem),
    });
    const data = await res.json();
    setRenameItem(null);
    fetchItems(currentFolderId);
  }

  async function deleteItem(item, type) {
    await fetch(`${API}/drive/item/${item._id}?type=${type}`, { method: "DELETE" });
    fetchItems(currentFolderId);
  }

  function Breadcrumbs() {
    return (
      <div className="flex items-center gap-2 text-slate-200">
        <button onClick={goHome} className="flex items-center gap-2 hover:text-white transition">
          <Home size={18} /> Home
        </button>
        {path.map((p, idx) => (
          <div key={p._id} className="flex items-center gap-2">
            <span className="text-slate-400">/</span>
            <button
              onClick={() => {
                setPath(path.slice(0, idx + 1));
                fetchItems(p._id);
              }}
              className="hover:text-white transition"
            >
              {p.name}
            </button>
          </div>
        ))}
      </div>
    );
  }

  function Toolbar() {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow"
        >
          <Plus size={18} /> New Folder
        </button>
        <label className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow">
          <Upload size={18} /> Upload
          <input type="file" className="hidden" multiple onChange={(e) => handleUpload(e.target.files)} />
        </label>
      </div>
    );
  }

  function Grid() {
    if (loading) {
      return <div className="text-slate-300">Loading...</div>;
    }
    if (!items.folders.length && !items.files.length) {
      return <div className="text-slate-400">This folder is empty</div>;
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.folders.map((f) => (
          <div key={f._id} className="group p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition relative">
            <button onDoubleClick={() => openFolder(f)} className="w-full text-left">
              <FolderIcon className="text-yellow-400 mb-2" size={36} />
              <div className="font-medium text-slate-100 truncate">{f.name}</div>
              <div className="text-xs text-slate-400">Folder</div>
            </button>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
              <button onClick={() => setRenameItem({ id: f._id, type: "folder", name: f.name })} className="p-1 rounded hover:bg-slate-700"><Pencil size={16} /></button>
              <button onClick={() => deleteItem(f, "folder")} className="p-1 rounded hover:bg-slate-700"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {items.files.map((f) => (
          <div key={f._id} className="group p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition relative">
            <a href={`${API}/drive/download/${f._id}`} className="w-full block">
              <FileIcon className="text-blue-400 mb-2" size={36} />
              <div className="font-medium text-slate-100 truncate" title={f.name}>{f.name}</div>
              <div className="text-xs text-slate-400">{prettyBytes(f.size)}</div>
            </a>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
              <a href={`${API}/drive/download/${f._id}`} className="p-1 rounded hover:bg-slate-700"><Download size={16} /></a>
              <button onClick={() => setRenameItem({ id: f._id, type: "file", name: f.name })} className="p-1 rounded hover:bg-slate-700"><Pencil size={16} /></button>
              <button onClick={() => deleteItem(f, "file")} className="p-1 rounded hover:bg-slate-700"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumbs />
          <Toolbar />
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleUpload(e.dataTransfer.files);
          }}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
        >
          <Grid />
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">Create folder</h3>
            <input ref={inputRef} className="w-full mb-4 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none" placeholder="New folder" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600">Cancel</button>
              <button onClick={() => { setCreating(false); createFolder(inputRef.current.value); }} className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500">Create</button>
            </div>
          </div>
        </div>
      )}

      {renameItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">Rename</h3>
            <input
              className="w-full mb-4 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none"
              value={renameItem.name}
              onChange={(e) => setRenameItem({ ...renameItem, name: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameItem(null)} className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600">Cancel</button>
              <button onClick={doRename} className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
