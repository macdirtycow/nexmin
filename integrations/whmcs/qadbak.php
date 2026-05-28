<?php
/**
 * WHMCS provisioning module — Qadbak API v1
 *
 * Config options (Server module settings):
 *  1. API Token (Bearer from Admin → API keys, full integration scopes)
 *  2. Default plan name (must exist in Qadbak Admin → Plans)
 *  3. Disk limit (e.g. 10GB or 10240MB)
 *  4. Max mailboxes
 *  5. Max databases
 *  6. Bandwidth limit (optional, e.g. 100GB)
 *
 * Product custom fields: map package name to plan via config option 2 or per-product overrides.
 */
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

function qadbak_MetaData()
{
    return [
        'DisplayName' => 'Qadbak',
        'APIVersion' => '1.1',
        'RequiresServer' => true,
    ];
}

function qadbak_ConfigOptions()
{
    return [
        'API Token' => [
            'Type' => 'password',
            'Description' => 'Bearer token from Qadbak Admin → API keys',
        ],
        'Default plan' => [
            'Type' => 'text',
            'Description' => 'Plan name in Qadbak (Admin → Plans), applied on create/change package',
            'Default' => 'Default',
        ],
        'Disk limit' => [
            'Type' => 'text',
            'Description' => 'Disk quota for new/changed packages (e.g. 10GB)',
            'Default' => '10GB',
        ],
        'Max mailboxes' => [
            'Type' => 'text',
            'Description' => 'Mailbox limit',
            'Default' => '25',
        ],
        'Max databases' => [
            'Type' => 'text',
            'Description' => 'MySQL database limit',
            'Default' => '5',
        ],
        'Bandwidth' => [
            'Type' => 'text',
            'Description' => 'Optional bandwidth cap (e.g. 100GB)',
            'Default' => '',
        ],
    ];
}

function qadbak_api($params, $method, $path, $body = null)
{
    $base = rtrim($params['serverhostname'] ?: $params['serverip'], '/');
    $url = $base . '/api/v1' . $path;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $params['configoption1'],
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 300,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 400) {
        $decoded = json_decode($raw, true);
        $msg = is_array($decoded) && isset($decoded['error']) ? $decoded['error'] : $raw;
        return ['error' => $msg ?: "HTTP $code"];
    }
    return json_decode($raw, true) ?: [];
}

function qadbak_domainPath($params)
{
    return '/domains/' . rawurlencode($params['domain']);
}

function qadbak_limitsFromParams($params)
{
    $plan = trim($params['configoption2'] ?? '') ?: 'Default';
    return [
        'plan' => $plan,
        'disk' => trim($params['configoption3'] ?? '') ?: '10GB',
        'mailboxes' => trim($params['configoption4'] ?? '') ?: '25',
        'databases' => trim($params['configoption5'] ?? '') ?: '5',
        'bandwidth' => trim($params['configoption6'] ?? ''),
    ];
}

function qadbak_CreateAccount($params)
{
    $domain = $params['domain'];
    $limits = qadbak_limitsFromParams($params);
    $r = qadbak_api($params, 'POST', '/domains', [
        'domain' => $domain,
        'user' => preg_replace('/[^a-z0-9_-]/', '', explode('.', $domain)[0]),
        'plan' => $limits['plan'],
        'pass' => $params['password'] ?? bin2hex(random_bytes(8)),
        'limits' => [
            'disk' => $limits['disk'],
            'mailboxes' => $limits['mailboxes'],
            'databases' => $limits['databases'],
            'bandwidth' => $limits['bandwidth'],
        ],
    ]);
    return isset($r['error']) ? $r['error'] : 'success';
}

function qadbak_TerminateAccount($params)
{
    $r = qadbak_api($params, 'DELETE', qadbak_domainPath($params));
    return isset($r['error']) ? $r['error'] : 'success';
}

function qadbak_SuspendAccount($params)
{
    $r = qadbak_api($params, 'POST', qadbak_domainPath($params) . '/suspend', [
        'enabled' => false,
    ]);
    return isset($r['error']) ? $r['error'] : 'success';
}

function qadbak_UnsuspendAccount($params)
{
    $r = qadbak_api($params, 'POST', qadbak_domainPath($params) . '/suspend', [
        'enabled' => true,
    ]);
    return isset($r['error']) ? $r['error'] : 'success';
}

function qadbak_ChangePackage($params)
{
    $limits = qadbak_limitsFromParams($params);
    $r = qadbak_api($params, 'PATCH', qadbak_domainPath($params) . '/limits', $limits);
    return isset($r['error']) ? $r['error'] : 'success';
}

function qadbak_ChangePassword($params)
{
    $user = $params['username'] ?? 'admin';
    $r = qadbak_api($params, 'POST', qadbak_domainPath($params) . '/mail', [
        'user' => $user,
        'pass' => $params['password'],
    ]);
    return isset($r['error']) ? $r['error'] : 'success';
}

function qadbak_AdminSingleSignOn($params)
{
    return [
        'success' => true,
        'redirectTo' => rtrim($params['serverhostname'] ?: $params['serverip'], '/'),
    ];
}
