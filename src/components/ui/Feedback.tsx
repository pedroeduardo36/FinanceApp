export function Feedback({ error, retry }: { error: string | null; retry?: () => void }) {
  if (!error) return null;
  return <div role="alert" className="my-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
    <p>{error}</p>{retry && <button type="button" onClick={retry} className="mt-2 underline">Tentar novamente</button>}
  </div>;
}
