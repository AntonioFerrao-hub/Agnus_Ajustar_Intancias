<?php
// Exibir erros em desenvolvimento
ini_set('display_errors', 1);
error_reporting(E_ALL);

// DB
require_once __DIR__ . '/includes/db.php';
$db = (new Database())->getConnection();

// Iniciar sessão para proteção CSRF
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Gerar token CSRF se não existir
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Configurações WU
define('WU_API_BASE', 'https://wu3.ideiasia.com.br');
define('WU_AUTH_TOKEN', '6eccff117006aad2c3214696c98404b0');
define('WU_SERVER_NAME', 'WU');

// Configurações WU2
define('WU2_API_BASE', 'https://wu2.ideiasia.com.br');
define('WU2_AUTH_TOKEN', 'ee06909638bdc4365b41782d352d6302');
define('WU2_SERVER_NAME', 'WU');

// Buscar vendedores
$vendedores = $db->query("SELECT id, nome FROM vendedores_APP WHERE status='ativo' AND ativo=1 ORDER BY nome")->fetchAll();

// Vendedor selecionado
$vendedor_id = isset($_GET['vendedor_id']) ? intval($_GET['vendedor_id']) : 0;
$vendedor_nome = '';
if ($vendedor_id) {
    $stmt = $db->prepare("SELECT nome FROM vendedores_APP WHERE id=?");
    $stmt->execute([$vendedor_id]);
    $row = $stmt->fetch();
    $vendedor_nome = $row ? $row['nome'] : '';
}

// Gerar QR Code (AJAX)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'generate_qr') {
    // Validar token CSRF
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'message' => 'Token de segurança inválido.']);
        exit;
    }
    
    $token = trim($_POST['token'] ?? '');
    $serverType = trim($_POST['server_type'] ?? 'WU1');
    
    // Determinar qual API usar com base no tipo de servidor
    $apiBase = $serverType === 'WU1' ? WU_API_BASE : WU2_API_BASE;
    $authToken = $serverType === 'WU1' ? WU_AUTH_TOKEN : WU2_AUTH_TOKEN;
    
    if ($token) {
        $url = rtrim($apiBase, '/') . '/session/qr';
        $ch = curl_init($url);
        // Log de requisição (QR)
        error_log('QR API Request: ' . json_encode(['url' => $url, 'token' => $token]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'accept: application/json',
            'token: ' . $token
        ]);
        // Log 2: Cabeçalhos preparados
        error_log('QR API Headers Prepared');
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        // Log 3: Executando requisição
        error_log('QR API Executing request');
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // Log 4: Código HTTP da resposta
        error_log('QR API HTTP Code: ' . $httpCode);
        curl_close($ch);

        if ($result !== false && $httpCode >= 200 && $httpCode < 300) {
            // Log para debug
            error_log('QR API Response: ' . $result);
            echo $result; // Retorna a resposta da API diretamente
        } else {
            // Log de erro (QR)
            error_log('QR API Error: HTTP ' . $httpCode . ' Response: ' . ($result !== false ? $result : 'false'));
            echo json_encode(['success' => false, 'message' => 'Erro ao gerar QR Code: HTTP ' . $httpCode]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Token não fornecido.']);
    }
    exit;
}

// Conectar instância (AJAX)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'connect_instance') {
    // Validar token CSRF
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'message' => 'Token de segurança inválido.']);
        exit;
    }
    
    $token = trim($_POST['token'] ?? '');
    $serverType = trim($_POST['server_type'] ?? 'WU1');
    
    // Determinar qual API usar com base no tipo de servidor
    $apiBase = $serverType === 'WU1' ? WU_API_BASE : WU2_API_BASE;
    $authToken = $serverType === 'WU1' ? WU_AUTH_TOKEN : WU2_AUTH_TOKEN;
    
    if ($token) {
        $url = rtrim($apiBase, '/') . '/session/connect';
        $ch = curl_init($url);
        // Log de requisição (Connect)
        error_log('CONNECT API Request: ' . json_encode([
            'url' => $url,
            'token' => $token,
            'payload' => [
                'Subscribe' => ['Message', 'ChatPresence'],
                'Immediate' => true
            ]
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'accept: application/json',
            'token: ' . $token,
            'Content-Type: application/json'
        ]);
        // Log 2: Cabeçalhos preparados (Connect)
        error_log('CONNECT API Headers Prepared');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'Subscribe' => ['Message', 'ChatPresence'],
            'Immediate' => true
        ]));
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        // Log 3: Executando requisição (Connect)
        error_log('CONNECT API Executing request');
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // Log 4: Código HTTP da resposta (Connect)
        error_log('CONNECT API HTTP Code: ' . $httpCode);
        curl_close($ch);

        if ($result !== false && $httpCode >= 200 && $httpCode < 300) {
            // Log para debug
            error_log('CONNECT API Response: ' . $result);
            echo json_encode(['success' => true, 'message' => 'Instância conectada com sucesso!']);
        } else {
            // Log de erro (Connect)
            error_log('CONNECT API Error: HTTP ' . $httpCode . ' Response: ' . ($result !== false ? $result : 'false'));
            echo json_encode(['success' => false, 'message' => 'Erro ao conectar instância: HTTP ' . $httpCode]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Token não fornecido.']);
    }
    exit;
}

// Remover vínculo (AJAX)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'remove_instance') {
    // Definir cabeçalho de resposta JSON
    header('Content-Type: application/json; charset=utf-8');
    
    // Validar token CSRF
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'message' => 'Token de segurança inválido.']);
        exit;
    }
    
    // Validar e sanitizar dados de entrada
    $vendedorId = intval($_POST['vendedor_id'] ?? 0);
    $instanceName = trim($_POST['instance_name'] ?? '');
    $serverName = trim($_POST['server_name'] ?? '');
    if (!$serverName) {
        // Mantém compatibilidade: se não vier, assume WU
        $serverName = WU_SERVER_NAME;
    }

    // Validação mais rigorosa
    if ($vendedorId <= 0 || empty($instanceName) || empty($serverName)) {
        echo json_encode(['success' => false, 'message' => 'Dados insuficientes ou inválidos para remoção.']);
        exit;
    }

    // Verificar se a instância realmente pertence ao vendedor
    if ($vendedorId && $instanceName && $serverName) {
        try {
            $checkStmt = $db->prepare("SELECT COUNT(*) FROM instancia_vendedor WHERE vendedor_id=? AND server_name=? AND instance_name=?");
            $checkStmt->execute([$vendedorId, $serverName, $instanceName]);
            $exists = $checkStmt->fetchColumn();
            
            if (!$exists) {
                echo json_encode(['success' => false, 'message' => 'Instância não encontrada ou não pertence ao vendedor.']);
                exit;
            }
            
            // Proceder com a remoção
            $stmt = $db->prepare("DELETE FROM instancia_vendedor WHERE vendedor_id=? AND server_name=? AND instance_name=?");
            $result = $stmt->execute([$vendedorId, $serverName, $instanceName]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Instância removida com sucesso!']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Nenhuma instância foi removida.']);
            }
        } catch (PDOException $e) {
            error_log("Erro ao remover instância: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Erro interno do servidor.']);
        }
    }
    exit;
}

// Salvar vínculos
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['vendedor_id']) && ($_POST['action'] ?? '') === 'save_links') {
    // Validar token CSRF
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        header('Location: gerenciar_instancias_wu.php?error=csrf');
        exit;
    }
    
    $vid = intval($_POST['vendedor_id']);
    $selecionadas = $_POST['instancia'] ?? []; // valores "name|id|token"
    foreach ($selecionadas as $packed) {
        // Explode em 3 partes no máximo para evitar problemas com |
        $parts = explode('|', $packed, 3);
        $name  = $parts[0] ?? '';
        $id    = $parts[1] ?? '';
        $token = $parts[2] ?? '';
        $name = trim($name);
        $id = trim($id);
        $token = trim($token);
        if ($vid && $name && $token) {
            // Verificar de qual servidor vem a instância
            $serverType = isset($_POST['server_type']) ? trim($_POST['server_type']) : 'WU1';
            $serverName = $serverType === 'WU1' ? WU_SERVER_NAME : WU2_SERVER_NAME;
            $apiBase = $serverType === 'WU1' ? WU_API_BASE : WU2_API_BASE;
            
            // Persistimos token como "apikey" e base API como "server_url"
            $stmt = $db->prepare("
                INSERT INTO instancia_vendedor (server_name, instance_name, vendedor_id, apikey, server_url)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE apikey = VALUES(apikey), server_url = VALUES(server_url)
            ");
            $stmt->execute([$serverName, $name, $vid, $token, rtrim($apiBase, '/')]);
        }
    }
    header("Location: gerenciar_instancias_wu.php?vendedor_id=$vid&ok=1");
    exit;
}

// Buscar vínculos atuais (TODOS os servidores para esta tela) e index WU para marcação
$vinculos = [];
$vinculos_wu_names = [];
if ($vendedor_id) {
    $stmt = $db->prepare("SELECT server_name, instance_name, apikey, server_url FROM instancia_vendedor WHERE vendedor_id=?");
    $stmt->execute([$vendedor_id]);
    foreach ($stmt->fetchAll() as $row) {
        $srv = $row['server_name'];
        $inst = $row['instance_name'];
        $vinculos[$srv][$inst] = [
            'apikey' => $row['apikey'],
            'server_url' => $row['server_url']
        ];
        if ($srv === WU_SERVER_NAME || $srv === WU2_SERVER_NAME) {
            $vinculos_wu_names[$inst] = true;
        }
    }
}

// Buscar vínculos atuais (WU1 e WU2 para esta tela)
$vinculos_wu = [];
if ($vendedor_id) {
    // Buscar tanto WU1 quanto WU2
    $stmt = $db->prepare("SELECT instance_name, apikey, server_url, server_name FROM instancia_vendedor WHERE vendedor_id=? AND (server_name=? OR server_name=?)");
    $stmt->execute([$vendedor_id, WU_SERVER_NAME, WU2_SERVER_NAME]);
    foreach ($stmt->fetchAll() as $row) {
        $vinculos_wu[$row['instance_name']] = [
            'apikey' => $row['apikey'],
            'server_url' => $row['server_url'],
            'server_name' => $row['server_name']
        ];
    }
}

// Função para buscar instâncias na API WU
function fetchWuUsers($baseUrl, $authToken, &$errorMsg = null) {
    $url = rtrim($baseUrl, '/') . '/admin/users';
    $result = null;
    $httpCode = 0;
    
    if (function_exists('curl_init')) {
        // Caminho padrão via cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'accept: application/json',
            'Authorization: ' . $authToken
        ]);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $result = curl_exec($ch);
        if ($result === false) {
            $errorMsg = 'Erro CURL: ' . curl_error($ch);
            curl_close($ch);
            return null;
        }
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        // Fallback sem cURL usando file_get_contents
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "accept: application/json\r\nAuthorization: " . $authToken . "\r\n",
                'timeout' => 15,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => false
            ]
        ]);
        $result = @file_get_contents($url, false, $context);
        if ($result === false) {
            $hdr = isset($http_response_header) ? implode(' | ', (array)$http_response_header) : 'Sem headers';
            $errorMsg = 'Erro ao requisitar sem cURL. URL: ' . $url . ' Headers: ' . $hdr;
            return null;
        }
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $httpCode = (int)$m[1];
        } else {
            $httpCode = 200;
        }
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        $errorMsg = 'HTTP ' . $httpCode . ' ao chamar ' . $url;
        return null;
    }

    $data = json_decode($result, true);
    if (!is_array($data)) {
        $errorMsg = 'Resposta inválida da API (não é JSON válido)';
        return null;
    }
    if (!isset($data['success']) || $data['success'] !== true) {
        $errorMsg = 'API retornou sucesso = false';
        return null;
    }
    if (!isset($data['data']) || !is_array($data['data'])) {
        $errorMsg = 'Estrutura inesperada: campo "data" ausente';
        return null;
    }
    return $data['data'];
}

$errorMsg = null;
$instances = fetchWuUsers(WU_API_BASE, WU_AUTH_TOKEN, $errorMsg);

// Buscar instâncias do segundo servidor WU2
$errorMsg2 = null;
$instances2 = fetchWuUsers(WU2_API_BASE, WU2_AUTH_TOKEN, $errorMsg2);

// Faça uma cópia estável para evitar que outra parte do template sobrescreva $instances
$wuInstances = is_array($instances) ? $instances : [];

// Adicionar instâncias do segundo servidor, se disponíveis
if (is_array($instances2)) {
    // Adicionar um identificador para diferenciar as instâncias do segundo servidor
    foreach ($instances2 as &$inst) {
        $inst['server'] = 'WU2';
    }
    unset($inst); // Limpar referência
    
    // Combinar as instâncias dos dois servidores
    $wuInstances = array_merge($wuInstances, $instances2);
}

// Adicionar identificador para instâncias do primeiro servidor
foreach ($wuInstances as &$inst) {
    if (!isset($inst['server'])) {
        $inst['server'] = 'WU1';
    }
}
unset($inst); // Limpar referência

// Separar conectadas/desconectadas usando a cópia estável
$connected = [];
$disconnected = [];
foreach ($wuInstances as $inst) {
    $isConnected = !empty($inst['connected']) && !empty($inst['loggedIn']);
    if ($isConnected) {
        $connected[] = $inst;
    } else {
        $disconnected[] = $inst;
    }
}

function maskToken($t, $visible = 4) {
    if (!$t) return '';
    $len = strlen($t);
    if ($len <= $visible * 2) return $t;
    return substr($t, 0, $visible) . str_repeat('*', max(0, $len - ($visible * 2))) . substr($t, -$visible);
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar Instâncias WU</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="../includes/sidebar.css?v=<?= time() ?>">
    <style>
        .card-hover { transition: all .2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
        .gradient-bg { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); }
        .status-badge { border-radius: 9999px; padding: .125rem .5rem; font-size: .75rem; }
        .instance-avatar { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); }
        .truncate-max { max-width: 240px; }
        @media (max-width: 640px) { .truncate-max { max-width: 160px; } }
        input:focus, select:focus, button:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
    </style>
</head>
<body class="bg-gray-50">
    <?php include '../includes/sidebar.php'; ?>

    <div id="content" class="content-with-sidebar content-with-sidebar-expanded">
        <div class="container mx-auto px-6 py-8">
            <!-- Header -->
            <div class="gradient-bg rounded-xl p-6 mb-8 text-white">
                <div class="flex items-center">
                    <div class="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                        <i class="fas fa-network-wired text-2xl"></i>
                    </div>
                    <div>
                        <h1 class="text-3xl font-bold">Gerenciar Instâncias WU</h1>
                        <p class="text-blue-100 mt-1">Vincule instâncias WU para cada vendedor</p>
                    </div>
                </div>
            </div>

            <!-- Feedback -->
            <?php if (isset($_GET['error']) && $_GET['error'] === 'csrf'): ?>
                <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg" role="alert">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-red-400 text-xl"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-red-700 font-medium">
                                Erro de segurança: Token inválido. Tente novamente.
                            </p>
                        </div>
                    </div>
                </div>
            <?php elseif (isset($_GET['ok'])): ?>
                <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg" role="alert">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-green-400 text-xl"></i>
                        <p class="text-green-700 font-medium ml-3">Instâncias WU atualizadas com sucesso!</p>
                    </div>
                </div>
            <?php endif; ?>
            <?php if ($errorMsg): ?>
                <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                    <div class="flex items-center text-red-700">
                        <i class="fas fa-triangle-exclamation mr-2"></i>
                        <span><?= htmlspecialchars($errorMsg) ?></span>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Seleção de Vendedor -->
            <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div class="flex items-center mb-6">
                    <div class="bg-blue-100 rounded-lg p-2 mr-3">
                        <i class="fas fa-user-tie text-blue-600 text-lg"></i>
                    </div>
                    <h2 class="text-xl font-semibold text-gray-800">Selecionar Vendedor</h2>
                </div>

                <form method="GET" class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
                        <div class="flex-1">
                            <label for="vendedor_id" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-user mr-1"></i> Selecionar Vendedor
                            </label>
                            <select name="vendedor_id" id="vendedor_id"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                <option value="">Escolha um vendedor...</option>
                                <?php foreach ($vendedores as $v): ?>
                                    <option value="<?= $v['id'] ?>" <?= $v['id'] == $vendedor_id ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($v['nome']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="flex-shrink-0">
                            <button type="submit"
                                    class="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200 flex items-center justify-center">
                                <i class="fas fa-search mr-2"></i>
                                <span class="hidden sm:inline">Buscar Instâncias</span>
                                <span class="sm:hidden">Buscar</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <?php if ($vendedor_id && $vendedor_nome): ?>
                <!-- Informações do Vendedor -->
                <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div class="flex items-center">
                        <div class="instance-avatar w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mr-4">
                            <?= strtoupper(substr($vendedor_nome, 0, 1)) ?>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">Vendedor: <?= htmlspecialchars($vendedor_nome) ?></h2>
                            <p class="text-gray-600">Gerencie as instâncias WU vinculadas a este vendedor</p>
                        </div>
                    </div>
                </div>

                <!-- Instâncias Atualmente Vinculadas (TODOS os servidores) -->
                <?php if (!empty($vinculos)): ?>
                    <div class="bg-white rounded-xl shadow-lg mb-8">
                        <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                            <div class="flex items-center">
                                <div class="bg-green-100 rounded-lg p-2 mr-3">
                                    <i class="fas fa-link text-green-600 text-lg"></i>
                                </div>
                                <div>
                                    <h2 class="text-xl font-semibold text-gray-800">Instâncias Atualmente Vinculadas</h2>
                                    <p class="text-sm text-gray-600">Instâncias associadas a este vendedor (todos os servidores)</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-6">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <?php foreach ($vinculos as $server_name => $srvInstances): ?>
                                    <?php foreach ($srvInstances as $instance_name => $data): ?>
                                        <div class="card-hover bg-white border border-gray-200 rounded-xl p-6 hover:border-green-300">
                                            <div class="flex items-center justify-between mb-4">
                                                <div class="flex items-center">
                                                    <div class="bg-green-100 rounded-lg p-2 mr-3">
                                                        <i class="fab fa-whatsapp text-green-600 text-lg"></i>
                                                    </div>
                                                    <div>
                                                        <h3 class="font-semibold text-gray-900"><?= htmlspecialchars($instance_name) ?></h3>
                                                        <p class="text-sm text-gray-500"><?= htmlspecialchars($server_name) ?></p>
                                                    </div>
                                                </div>
                                                <button onclick="removeInstance('<?= $vendedor_id ?>', '<?= htmlspecialchars($server_name) ?>', '<?= htmlspecialchars($instance_name) ?>')" 
                                                        class="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors duration-200" 
                                                        title="Remover">
                                                    <i class="fas fa-unlink"></i>
                                                </button>
                                            </div>

                                            <div class="space-y-2">
                                                <div class="flex items-center text-sm text-gray-600">
                                                    <i class="fas fa-key w-4 mr-2 text-gray-400"></i>
                                                    <span class="truncate font-mono text-xs" title="<?= htmlspecialchars($data['apikey']) ?>">
                                                        <?= htmlspecialchars(substr($data['apikey'], 0, 20)) ?>...
                                                    </span>
                                                </div>
                                                <div class="flex items-center text-sm text-gray-600">
                                                    <i class="fas fa-globe w-4 mr-2 text-gray-400"></i>
                                                    <span class="truncate" title="<?= htmlspecialchars($data['server_url']) ?>">
                                                        <?= htmlspecialchars(substr($data['server_url'], 0, 30)) ?>...
                                                    </span>
                                                </div>
                                            </div>

                                            <div class="mt-4 pt-4 border-t border-gray-100">
                                                <span class="status-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <i class="fas fa-check-circle text-xs mr-1"></i> Vinculada
                                                </span>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Instâncias Disponíveis WU -->
                <div class="bg-white rounded-xl shadow-lg">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="bg-blue-100 rounded-lg p-2 mr-3">
                                    <i class="fas fa-plus-circle text-blue-600 text-lg"></i>
                                </div>
                                <div>
                                    <h2 class="text-xl font-semibold text-gray-800">Instâncias Disponíveis (WU1/WU2)</h2>
                                    <p class="text-sm text-gray-600">Selecione as instâncias para vincular ao vendedor</p>
                                </div>
                            </div>
                            
                            <!-- Botões de Alternância Grid/Lista -->
                            <div class="flex items-center space-x-2">
                                <button type="button" id="grid-view-btn" onclick="toggleView('grid')" 
                                        class="view-toggle-btn active bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors duration-200">
                                    <i class="fas fa-th text-sm"></i>
                                    <span class="ml-1 text-xs font-medium">Grade</span>
                                </button>
                                <button type="button" id="list-view-btn" onclick="toggleView('list')" 
                                        class="view-toggle-btn bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200">
                                    <i class="fas fa-list text-sm"></i>
                                    <span class="ml-1 text-xs font-medium">Lista</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="p-6">
                        <form method="POST" id="instances-form">
                            <input type="hidden" name="action" value="save_links">
                            <input type="hidden" name="vendedor_id" value="<?= $vendedor_id ?>">
                            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">

                            <div id="instances-container-wu" class="instances-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <?php if (empty($wuInstances)): ?>
                                <div class="text-gray-600">Nenhuma instância retornada pelas APIs WU1 e WU2.</div>
                            <?php else: ?>
                                <?php foreach ($wuInstances as $inst): 
                                    // Definições necessárias para evitar 'Undefined variable' e 'Deprecated'
                                    $name  = trim($inst['name'] ?? '');
                                    $id    = trim($inst['id'] ?? '');
                                    $jid   = trim($inst['jid'] ?? '');
                                    $token = trim($inst['token'] ?? '');
                                    $isConnected = !empty($inst['connected']) && !empty($inst['loggedIn']);
                                    $cwEnabled = isset($inst['chatwoot_config']['enabled']) && $inst['chatwoot_config']['enabled'];
                                    $cwUrl = $cwEnabled ? ($inst['chatwoot_config']['webhook_url'] ?? '') : '';
                                    // Marca como vinculada usando o índice novo ($vinculos_wu_names) ou o antigo ($vinculos_wu)
                                    $jaVinculada = $name && (isset($vinculos_wu_names[$name]) || isset($vinculos_wu[$name]));
                                ?>
                                <div class="card-hover bg-white border border-gray-200 rounded-xl p-6 <?= $isConnected ? 'hover:border-green-300' : 'bg-red-50 border-red-200' ?> <?= $jaVinculada ? 'border-green-300 bg-green-50' : '' ?> relative">
                                    <!-- Checkbox ou botão de remoção no canto superior direito -->
                                    <?php if (!$jaVinculada && $name && $token): ?>
                                        <input type="checkbox" name="instancia[]" value="<?= htmlspecialchars($name) ?>|<?= htmlspecialchars($id) ?>|<?= htmlspecialchars($token) ?>"
                                               class="absolute top-4 right-4 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                               title="Selecionar para vincular">
                                    <?php elseif ($jaVinculada): ?>
                                        <button type="button" 
                                                class="btn-remove-instance absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center"
                                                data-vendedor-id="<?= $vendedor_id ?>"
                                                data-instance-name="<?= htmlspecialchars($name) ?>"
                                                title="Remover vinculação">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    <?php endif; ?>
                                    
                                    <!-- Header com ícone e nome -->
                                    <div class="flex items-center mb-4">
                                        <div class="<?= $isConnected ? 'bg-green-100' : 'bg-red-100' ?> rounded-lg p-2 mr-3">
                                            <i class="fab fa-whatsapp <?= $isConnected ? 'text-green-600' : 'text-red-600' ?> text-lg"></i>
                                        </div>
                                        <div class="flex-1">
                                            <h3 class="font-semibold text-gray-900 truncate" title="<?= htmlspecialchars($name) ?>">
                                                <?= htmlspecialchars($name ?: '(sem nome)') ?>
                                                <span class="ml-1 text-xs font-medium px-2 py-1 rounded-full <?= $inst['server'] === 'WU1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800' ?>">
                                                    <?= htmlspecialchars($inst['server']) ?>
                                                </span>
                                            </h3>
                                            <div class="flex items-center gap-2 mt-1 flex-wrap">
                                                <?php if ($isConnected): ?>
                                                    <span class="status-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Conectada</span>
                                                <?php else: ?>
                                                    <span class="status-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Desconectada</span>
                                                <?php endif; ?>
                                                <?php if ($cwEnabled): ?>
                                                    <span class="status-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title="<?= htmlspecialchars($cwUrl) ?>">Chatwoot</span>
                                                <?php endif; ?>
                                                <?php if ($jaVinculada): ?>
                                                    <span class="status-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Vinculada</span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Detalhes -->
                                    <div class="space-y-2 text-sm text-gray-700">
                                        <div class="flex items-center">
                                            <i class="fas fa-fingerprint w-4 mr-2 text-gray-400"></i>
                                            <span class="truncate" title="<?= htmlspecialchars($id) ?>">ID: <?= htmlspecialchars($id ?: '—') ?></span>
                                        </div>
                                        <div class="flex items-center">
                                            <i class="fas fa-hashtag w-4 mr-2 text-gray-400"></i>
                                            <span class="truncate" title="<?= htmlspecialchars($jid) ?>">JID: <?= htmlspecialchars($jid ?: '—') ?></span>
                                        </div>
                                        <div class="flex items-center">
                                            <i class="fas fa-key w-4 mr-2 text-gray-400"></i>
                                            <span class="font-mono truncate" title="<?= htmlspecialchars($token) ?>">
                                                Token: <?= htmlspecialchars(maskToken($token)) ?>
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <!-- Botões para instâncias desconectadas -->
                                    <?php if (!$isConnected && $token): ?>
                                    <div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
                                        <button type="button" 
                                                class="btn-qr-instance w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                                                data-token="<?= htmlspecialchars($token) ?>"
                                                data-instance-name="<?= htmlspecialchars($name) ?>"
                                                title="Gerar QR Code">
                                            <i class="fas fa-qrcode mr-2"></i>
                                            <span>Gerar QR Code</span>
                                        </button>
                                        <button type="button" 
                                                class="btn-connect-instance w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                                                data-token="<?= htmlspecialchars($token) ?>"
                                                data-instance-name="<?= htmlspecialchars($name) ?>"
                                                title="Conectar instância">
                                            <i class="fas fa-plug mr-2"></i>
                                            <span>Conectar</span>
                                        </button>
                                    </div>
                                    <?php endif; ?>
                                </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                                </div>

                                <?php if (!empty($wuInstances)): ?>
                                <div class="flex justify-end pt-6 border-t border-gray-200">
                                    <button type="submit" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200">
                                        <i class="fas fa-save mr-2"></i> Salvar Vínculos
                                    </button>
                                </div>
                                <?php endif; ?>
                            </form>
                        </div>
                    </div>
            <?php endif; ?>

            <?php if (!$vendedor_id): ?>
                <!-- Mensagem quando nenhum vendedor está selecionado -->
                <div class="bg-white rounded-xl shadow-lg">
                    <div class="text-center py-12">
                        <div class="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-tie text-blue-600 text-3xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Selecione um vendedor</h3>
                        <p class="text-gray-500 mb-4">Escolha um vendedor para gerenciar suas instâncias de WhatsApp</p>
                        <div class="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                            <p class="text-sm text-blue-700">
                                <i class="fas fa-lightbulb mr-1"></i>
                                Dica: Use o formulário acima para selecionar o vendedor desejado
                            </p>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
            
        </div>
    </div>

    <!-- Botão Flutuante Salvar -->
    <button id="floating-save-btn" title="Salvar vínculos"
            class="hidden fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 focus:outline-none focus:ring-4 focus:ring-blue-300">
        <i class="fas fa-save"></i>
    </button>

    <script>
        function toggleView(view) {
            const container = document.getElementById('instances-container-wu');
            const gridBtn = document.getElementById('grid-view-btn');
            const listBtn = document.getElementById('list-view-btn');
            if (!container || !gridBtn || !listBtn) return;
            if (view === 'grid') {
                container.classList.add('grid','md:grid-cols-2','lg:grid-cols-3');
                container.classList.remove('divide-y','space-y-4');
                gridBtn.classList.add('active','bg-blue-100','text-blue-600');
                listBtn.classList.remove('active','bg-blue-100','text-blue-600');
                listBtn.classList.add('bg-gray-100','text-gray-600');
            } else {
                container.classList.remove('grid','md:grid-cols-2','lg:grid-cols-3');
                container.classList.add('divide-y','space-y-4');
                listBtn.classList.add('active','bg-blue-100','text-blue-600');
                gridBtn.classList.remove('active','bg-blue-100','text-blue-600');
                gridBtn.classList.add('bg-gray-100','text-gray-600');
            }
        }

        // Mostrar botão flutuante quando houver checkboxes marcados
        document.addEventListener('change', function(e) {
            if (e.target && e.target.matches('input[type="checkbox"][name="instancia[]"]')) {
                const anyChecked = Array.from(document.querySelectorAll('input[name="instancia[]"]:checked')).length > 0;
                const floatBtn = document.getElementById('floating-save-btn');
                if (floatBtn) floatBtn.classList.toggle('hidden', !anyChecked);
            }
        });
        // Ao clicar no botão flutuante, submete o formulário principal
        document.getElementById('floating-save-btn')?.addEventListener('click', function() {
            document.getElementById('instances-form')?.submit();
        });

        // Event listeners para botões de remoção
        document.querySelectorAll('.btn-remove-instance').forEach(button => {
            button.addEventListener('click', function() {
                const vendedorId = this.getAttribute('data-vendedor-id');
                const instanceName = this.getAttribute('data-instance-name');
                const serverType = this.closest('.card-hover').querySelector('.ml-1.text-xs.font-medium').textContent.trim();
                const serverName = serverType === 'WU1' ? '<?= WU_SERVER_NAME ?>' : '<?= WU2_SERVER_NAME ?>';
                removeInstance(vendedorId, serverName, instanceName);
            });
        });

        // Event listeners para botões de conectar
        document.querySelectorAll('.btn-connect-instance').forEach(button => {
            button.addEventListener('click', function() {
                const token = this.getAttribute('data-token');
                const instanceName = this.getAttribute('data-instance-name');
                const serverType = this.closest('.card-hover').querySelector('.ml-1.text-xs.font-medium').textContent.trim();
                connectInstance(token, instanceName, this);
            });
        });

        // Event listeners para botões de QR Code
        document.querySelectorAll('.btn-qr-instance').forEach(button => {
            button.addEventListener('click', function() {
                const token = this.getAttribute('data-token');
                const instanceName = this.getAttribute('data-instance-name');
                generateQRCode(token, instanceName, this);
            });
        });

        async function removeInstance(vendedorId, serverName, instanceName) {
            if (!confirm('Remover a instância "' + instanceName + '" (' + (serverName || '<?= WU_SERVER_NAME ?>') + ') deste vendedor?')) return;
            try {
                const formData = new FormData();
                formData.append('action', 'remove_instance');
                formData.append('vendedor_id', vendedorId);
                if (serverName) formData.append('server_name', serverName);
                formData.append('instance_name', instanceName);
                formData.append('csrf_token', '<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>');
                const res = await fetch(window.location.href, { method: 'POST', body: formData });
                const json = await res.json();
                if (json.success) {
                    location.reload();
                } else {
                    alert(json.message || 'Falha ao remover.');
                }
            } catch (e) {
                alert('Erro de rede ao remover: ' + e.message);
            }
        }

        async function connectInstance(token, instanceName, buttonElement) {
            if (!confirm('Conectar a instância "' + instanceName + '"?')) return;
            
            // Obter o tipo de servidor (WU1 ou WU2)
            const serverType = buttonElement.closest('.card-hover').querySelector('.ml-1.text-xs.font-medium').textContent.trim();
            
            // Desabilitar o botão e mostrar loading
            const originalContent = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Conectando...';
            
            try {
                const formData = new FormData();
                formData.append('action', 'connect_instance');
                formData.append('token', token);
                formData.append('server_type', serverType); // Adicionar o tipo de servidor
                formData.append('csrf_token', '<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>');

                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                     throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                 }
                 
                 const result = await response.json();
                 if (result.success) {
                     alert(result.message || 'Instância "' + instanceName + '" conectada com sucesso!');
                     location.reload();
                 } else {
                     alert('Erro: ' + (result.message || 'Erro desconhecido'));
                 }
            } catch (error) {
                console.error('Erro ao conectar instância:', error);
                alert('Erro ao conectar a instância "' + instanceName + '": ' + error.message);
                // Restaurar o botão
                buttonElement.disabled = false;
                buttonElement.innerHTML = originalContent;
            }
         }

        async function generateQRCode(token, instanceName, buttonElement) {
            // Obter o tipo de servidor (WU1 ou WU2)
            const serverType = buttonElement.closest('.card-hover').querySelector('.ml-1.text-xs.font-medium').textContent.trim();
            
            // Desabilitar o botão e mostrar loading
            const originalContent = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Gerando...';
            
            try {
                const formData = new FormData();
                formData.append('action', 'generate_qr');
                formData.append('token', token);
                formData.append('server_type', serverType); // Adicionar o tipo de servidor
                formData.append('csrf_token', '<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>');

                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Resposta da API:', result);
                    
                if (result.data && result.data.QRCode) {
                    console.log('QR Code encontrado, abrindo modal...');
                    showQRCodeModal(result.data.QRCode, instanceName);
                } else if (result.success === false) {
                    console.log('Erro da API:', result.message);
                    alert('Erro: ' + (result.message || 'Erro desconhecido'));
                } else {
                    console.log('Estrutura da resposta inesperada:', result);
                    alert('QR Code não disponível na resposta da API.');
                }
                } else {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
            } catch (error) {
                console.error('Erro ao gerar QR Code:', error);
                alert('Erro ao gerar QR Code para "' + instanceName + '": ' + error.message);
            } finally {
                // Restaurar o botão
                buttonElement.disabled = false;
                buttonElement.innerHTML = originalContent;
            }
        }

        function showQRCodeModal(qrCodeData, instanceName) {
            console.log('showQRCodeModal chamada com:', { qrCodeData: qrCodeData ? 'dados presentes' : 'dados ausentes', instanceName });
            
            // Verificar se os dados já contêm o prefixo data:image
            let imageSource = qrCodeData;
            if (!qrCodeData.startsWith('data:image/')) {
                imageSource = 'data:image/png;base64,' + qrCodeData;
            }
            console.log('Fonte da imagem processada:', imageSource.substring(0, 50) + '...');
            
            // Criar o modal
            const modal = document.createElement('div');
            modal.id = 'qrModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
            
            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                    <div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <i class="fab fa-whatsapp text-2xl mr-3"></i>
                                <div>
                                    <h2 class="text-xl font-bold">QR Code WhatsApp</h2>
                                    <p class="text-green-100 text-sm">${instanceName}</p>
                                </div>
                            </div>
                            <button onclick="closeQRModal()" class="text-white hover:text-gray-200 transition">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-6">
                        <div class="text-center mb-6">
                            <div id="qrContainer" class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 min-h-[280px] flex items-center justify-center">
                                <img id="qrImage" src="${imageSource}" alt="QR Code WhatsApp" class="max-w-[240px] max-h-[240px] rounded-lg shadow-lg" onerror="console.error('Erro ao carregar imagem QR Code'); this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;text-red-500 text-center&quot;><i class=&quot;fas fa-exclamation-triangle text-4xl mb-2&quot;></i><br>Erro ao carregar QR Code</div>';">
                            </div>
                        </div>
                        
                        <div class="flex space-x-3 mb-4">
                            <button onclick="refreshQRCode('${instanceName}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center" id="refreshQRBtn">
                                <i class="fas fa-sync-alt mr-2"></i>
                                Atualizar QR
                            </button>
                            <button onclick="closeQRModal()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition">
                                Fechar
                            </button>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div class="flex items-start">
                                <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                                <div class="text-sm text-blue-800">
                                    <p class="font-medium mb-1">Como conectar:</p>
                                    <ol class="list-decimal list-inside space-y-1 text-blue-700">
                                        <li>Abra o WhatsApp no seu celular</li>
                                        <li>Toque em "Mais opções" ou "⋮"</li>
                                        <li>Toque em "Aparelhos conectados"</li>
                                        <li>Toque em "Conectar um aparelho"</li>
                                        <li>Escaneie o QR code acima</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                        
                        <div id="qrLog" class="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-32 overflow-y-auto hidden"></div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Log inicial
            qrLog('✓ QR Code gerado com sucesso!', 'success');
            qrLog('📱 Escaneie com seu WhatsApp', 'info');
            
            // Fechar modal ao clicar fora
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeQRModal();
                }
            });
        }
        
        function qrLog(msg, type = 'info') {
            const logEl = document.getElementById('qrLog');
            if (!logEl) return;
            
            logEl.classList.remove('hidden');
            
            const timestamp = new Date().toLocaleTimeString('pt-BR');
            const colors = {
                info: 'text-blue-300',
                success: 'text-green-300',
                error: 'text-red-300',
                warning: 'text-yellow-300'
            };
            
            const logEntry = document.createElement('div');
            logEntry.className = `${colors[type]} mb-1`;
            logEntry.textContent = `[${timestamp}] ${msg}`;
            logEl.appendChild(logEntry);
            logEl.scrollTop = logEl.scrollHeight;
        }
        
        async function refreshQRCode(instanceName) {
            const button = document.getElementById('refreshQRBtn');
            if (!button) return;
            
            const originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Atualizando...';
            
            qrLog('🔄 Atualizando QR Code...', 'info');
            
            try {
                // Encontrar o token da instância atual
                const qrButtons = document.querySelectorAll('.btn-qr-instance');
                let token = null;
                
                qrButtons.forEach(btn => {
                    if (btn.dataset.instanceName === instanceName) {
                        token = btn.dataset.token;
                    }
                });
                
                if (!token) {
                    throw new Error('Token não encontrado para esta instância');
                }
                
                const formData = new FormData();
                formData.append('action', 'generate_qr');
                formData.append('token', token);
                formData.append('csrf_token', '<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>');
                
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.data && result.data.QRCode) {
                    const qrImage = document.getElementById('qrImage');
                    if (qrImage) {
                        // Verificar se os dados já contêm o prefixo data:image
                        let imageSource = result.data.QRCode;
                        if (!result.data.QRCode.startsWith('data:image/')) {
                            imageSource = 'data:image/png;base64,' + result.data.QRCode;
                        }
                        qrImage.src = imageSource;
                        qrLog('✓ QR Code atualizado!', 'success');
                    }
                } else if (result.success === false) {
                    throw new Error(result.message || 'Erro desconhecido');
                } else {
                    throw new Error('QR Code não encontrado na resposta');
                }
                
            } catch (error) {
                console.error('Erro ao atualizar QR Code:', error);
                qrLog('❌ ' + error.message, 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }
        
        function closeQRModal() {
            const modal = document.getElementById('qrModal');
            if (modal) {
                modal.remove();
            }
        }
        
        // Função de teste para debug
        function testQRModal() {
            console.log('Testando modal QR com dados da API real...');
            // Simular resposta exata da API WU
            const apiResponse = {
                "code": 200,
                "data": {
                    "QRCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEX///8AAABVwtN+AAAEw0lEQVR42uyZPa7zqhaGX0ThLmsCkZlGCktMKaU76FxmSkgUmQZWJkA6CuT3avlLvrNvvRMX9x6KXWQ/UhCsn2cR/Lv+v5YhudQ6njEs1bBjqGYDwlJJpoOAArtUbK4Pi5jN3qPAlCkstcAeBazMUaoj78RpxGW4yWYzWVfmzwFLlLX4O+VkkucN5tFDOxiIAvfoA/X4uVQ4sgUcCBTYCG7AEGGKvbdrBabQ8OOyvg3ovm4ynqfLXJ9rvi+303ie5vm/gvZXgK6BLC7fo5hiG4KwW7b6I/2+DJi1+ybVFQyx6o6bbKPVDCyjTwcBZB9uevBtAEafhiosCFH/4kNA8i1gg02B3KxezGbzEjUCDgIwYppR3SNdgtY3H0M1j8xFzCscvg/8uQvZAB9piidv1RXfZhbHdAwAlzsCNCaJDdMF4WQeeSGACZ8BMNl4FZYJA7j2YalPPhhngetHAaZPcyBg2wyYdAk0fKQ5yPja5PcBzTZW4uxJ2bTGwmxnu/BH4vwSgEsYItcCH+VZJt/AYhmHatbXdX8d2JvaTVzxCVW2aVhqheXSqvnR9b4L6AoUx3zX+jZd5rDB5jbLuv0txd8GRs+liuv+TsKloQWujxxRYf5s8gOA7fMVK9PQuDtMNCx2ibIdCMCy1s0yQU6Od9bqim1BuzoOAgzTHOiKv0d5Mt+XClN8DBxN/wxg2G2DbDYNJExCqE+Ne8poXoLxdUA/w5VrnxBQ9fjlqaJMwWgPAzLjtfKRW4A21ojnStX0dX2d5PeB0fawu2pChcuM4bk+tLmbMn0GMJslb5ptDXySbb5W1+0SyVcJOgRIQxSc7X0RUSvGs2DSeaz4gwCMNi/7XNACZc0KbPBtruv2KQA+DVFladBvt4xywhmh1Xd2fx8wzGTUltqCWrHWgqL7Jg8E0hSiFJfbUJ/Fpx3L1OHsVR8+APgoZMclUKvcft2+zTBrwjHArosim4ZcfW4Y4lVWnYXg2A8C9C5aEFXDoEJzmXFyfZoH/p0Wvw7oXoZbNQ823ose1wk2DQ3u7XK/BkzOqovwpM68Ko+jUyPFu6F8H4DvqsAuaUMZJ6+azjTPdS32KMBkLnpQ3VPnbsZgiktALW91/wDQEV5V7gT4JT6L62GRzeV0EDDC7rVFax2ZW6Aa6V5h/FEAgBlSbLrMVScU1s09+jxwG/9q87cB/Yxw3acBsk2Yw+nPf9Y1p88ARlNPtvPkF3LlPQYp8MtSx/FtpF8H4DNrZd8fOtTOxJSzXdo/c/fXAbN2DLeKs1dxHeEZZVWaju/3h18CcDk3qePZpllglDZ89MCq8nIQoDPAVaPi3iAFFwS1xjjr+HcYwD+hri216vBZzQbbZsE44RhAp+sQxfTpApGCoV1NOfsl4pX+nwC65a1uLnkK9TSuVTOhaQ4cBOzvtDcZXU5Bdl28SrF9HqrZJhwD7O/VsZpi7xSz7pXW6ahQ1/dB/RrYf2QhLBmr1lNINVRZfw9BBwArc4SszGlWWd2fxB9cFvJQYKnUUWAgV22y5v1e/ffHpiOAqMLCiOpymwNGtxvk9s8mfwcU2CiydqvJbdKuSX0K8a/KHQDsMQkyeVbtISFif8mRcfwRtF8F/l3/O+s/AQAA///lM0dZSaTeTQAAAABJRU5ErkJggg=="
                },
                "success": true
            };
            
            console.log('Resposta simulada da API:', apiResponse);
            
            if (apiResponse.data && apiResponse.data.QRCode) {
                console.log('QR Code encontrado na resposta simulada, abrindo modal...');
                // Extrair apenas a parte base64 (remover o prefixo data:image/png;base64,)
                const base64Data = apiResponse.data.QRCode.replace('data:image/png;base64,', '');
                showQRCodeModal(base64Data, 'Teste API Real');
            } else {
                console.error('QR Code não encontrado na resposta simulada');
            }
        }
        
        // Teste simples de JavaScript
        console.log('JavaScript carregado com sucesso!');
        console.log('Verificando se showQRCodeModal existe:', typeof showQRCodeModal);
        
        // Sistema de debug removido - QR Code funcionando corretamente
    </script>
</body>
</html>