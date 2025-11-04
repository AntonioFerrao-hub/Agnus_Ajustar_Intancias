import { useState, useRef } from 'react';
import { evolutionApiService } from '../services/evolutionApi';
import { wuzApiService } from '../services/wuzApi';
import { useServerStore } from '../store/useServerStore';

interface TestResult {
  id: string;
  service: string;
  endpoint: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  data?: any;
}

export function ApiTester() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const resultIdCounter = useRef(0);
  const { servers } = useServerStore();

  const addResult = (result: Omit<TestResult, 'id'>) => {
    const id = `test-${++resultIdCounter.current}`;
    const newResult = { ...result, id };
    setResults(prev => [...prev, newResult]);
    return id;
  };

  const updateResult = (id: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(result => 
      result.id === id ? { ...result, ...updates } : result
    ));
  };

  const clearResults = () => {
    setResults([]);
    resultIdCounter.current = 0;
  };

  const testEvolutionApiInfo = async () => {
    const resultId = addResult({
      service: 'Evolution API',
      endpoint: 'GET /',
      status: 'loading',
      message: 'Testando informações da API...'
    });

    try {
      const apiInfo = await evolutionApiService.getApiInfo();
      updateResult(resultId, {
        status: 'success',
        message: `API funcionando! Versão: ${apiInfo.version}`,
        data: apiInfo
      });
    } catch (error: any) {
      updateResult(resultId, {
        status: 'error',
        message: `Erro: ${error.message}`,
        data: error
      });
    }
  };

  const testEvolutionApiInstances = async () => {
    const resultId = addResult({
      service: 'Evolution API',
      endpoint: 'GET /instance/fetchInstances',
      status: 'loading',
      message: 'Buscando instâncias...'
    });

    try {
      const instances = await evolutionApiService.getAllInstances();
      updateResult(resultId, {
        status: 'success',
        message: `${Array.isArray(instances) ? instances.length : 0} instâncias encontradas`,
        data: instances
      });
    } catch (error: any) {
      updateResult(resultId, {
        status: 'error',
        message: `Erro: ${error.message}`,
        data: error
      });
    }
  };

  const testWuzApiUsers = async () => {
    const resultId = addResult({
      service: 'WUZAPI',
      endpoint: 'GET /admin/users',
      status: 'loading',
      message: 'Buscando usuários...'
    });

    try {
      const wuServer = servers.find(s => s.type === 'wuzapi' && s.isActive !== false);
      if (!wuServer) {
        updateResult(resultId, {
          status: 'error',
          message: 'Nenhum servidor WUZAPI ativo configurado',
        });
        return;
      }
      wuzApiService.setConfig(wuServer.url, wuServer.apiKey);
      const users = await wuzApiService.getUsers();
      updateResult(resultId, {
        status: 'success',
        message: `${users.length} usuários encontrados`,
        data: {
          users: users,
          summary: {
            total: users.length,
            connected: users.filter(u => u.connected).length,
            loggedIn: users.filter(u => u.loggedIn).length,
            chatwootEnabled: users.filter(u => u.chatwoot_config.enabled).length
          }
        }
      });
    } catch (error: any) {
      updateResult(resultId, {
        status: 'error',
        message: `Erro: ${error.message}`,
        data: error
      });
    }
  };

  const testEvolutionApi = async () => {
    await testEvolutionApiInfo();
    await testEvolutionApiInstances();
  };

  const testWuzApi = async () => {
    await testWuzApiUsers();
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();
    
    try {
      // Execute tests sequentially to avoid race conditions
      await testEvolutionApi();
      await testWuzApi();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Teste de Conectividade das APIs
        </h2>
        <p className="text-gray-600">
          Teste as conexões com Evolution API e WUZAPI usando as configurações atuais.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 sm:gap-3 md:gap-4">
        <button
          onClick={runAllTests}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          )}
          {isLoading ? 'Testando...' : 'Executar Todos os Testes'}
        </button>
        
        <button
          onClick={testEvolutionApi}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Testar Evolution API
        </button>
        
        <button
          onClick={testWuzApi}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Testar WUZAPI
        </button>
        
        <button
          onClick={clearResults}
          className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Limpar Resultados
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.id}
            className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{result.service}</span>
                <span className="text-sm font-mono bg-white px-2 py-1 rounded">
                  {result.endpoint}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.status === 'loading' && (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                )}
                <span className="text-sm font-medium capitalize">
                  {result.status}
                </span>
              </div>
            </div>
            
            <p className="text-sm mb-2">{result.message}</p>
            
            {result.data && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Ver dados da resposta
                </summary>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-64 sm:max-h-80">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        
        {results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Clique em um dos botões acima para testar as APIs
          </div>
        )}
      </div>
    </div>
  );
}