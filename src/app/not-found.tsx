import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-100 p-4">
      <h2 className="text-xl font-bold mb-2">404 — Page Not Found</h2>
      <p className="text-xs text-slate-400 mb-4">
        The route you are looking for does not exist.
      </p>
      <Link
        href="/workflow/trial-task"
        className="text-xs text-purple-400 hover:underline"
      >
        Return to Workflow Workspace →
      </Link>
    </div>
  );
}
