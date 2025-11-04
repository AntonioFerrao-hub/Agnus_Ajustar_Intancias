export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso negado</h2>
        <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
      </div>
    </div>
  );
}