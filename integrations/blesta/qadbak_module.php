<?php
/**
 * Blesta provisioning module — Qadbak API v1 (full package sync)
 */
class Qadbak extends Server
{
    public function getName()
    {
        return 'Qadbak';
    }

    private function api($host, $token, $method, $path, $body = null)
    {
        $url = rtrim($host, '/') . '/api/v1' . $path;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 300);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
        $raw = curl_exec($ch);
        curl_close($ch);
        return json_decode($raw, true) ?: [];
    }

    private function limits($package)
    {
        return [
            'plan' => $package->meta->plan ?? 'Default',
            'disk' => $package->meta->disk ?? '10GB',
            'mailboxes' => $package->meta->mailboxes ?? '25',
            'databases' => $package->meta->databases ?? '5',
            'bandwidth' => $package->meta->bandwidth ?? '',
        ];
    }

    public function addService($package, $service, $parent_package = null, $parent_service = null, $status = null)
    {
        $token = $package->meta->api_token ?? '';
        $host = $package->meta->host ?? '';
        $domain = $service->name;
        $this->api($host, $token, 'POST', '/domains', [
            'domain' => $domain,
            'plan' => $package->meta->plan ?? 'Default',
            'limits' => $this->limits($package),
        ]);
        return null;
    }

    public function suspendService($package, $service, $parent_package = null, $parent_service = null)
    {
        $token = $package->meta->api_token ?? '';
        $host = $package->meta->host ?? '';
        $this->api($host, $token, 'POST', '/domains/' . rawurlencode($service->name) . '/suspend', [
            'enabled' => false,
        ]);
        return null;
    }

    public function unsuspendService($package, $service, $parent_package = null, $parent_service = null)
    {
        $token = $package->meta->api_token ?? '';
        $host = $package->meta->host ?? '';
        $this->api($host, $token, 'POST', '/domains/' . rawurlencode($service->name) . '/suspend', [
            'enabled' => true,
        ]);
        return null;
    }

    public function cancelService($package, $service, $parent_package = null, $parent_service = null)
    {
        $token = $package->meta->api_token ?? '';
        $host = $package->meta->host ?? '';
        $this->api($host, $token, 'DELETE', '/domains/' . rawurlencode($service->name));
        return null;
    }

    public function changeServicePackage(
        $package_from,
        $package_to,
        $service,
        $parent_package = null,
        $parent_service = null
    ) {
        $token = $package_to->meta->api_token ?? '';
        $host = $package_to->meta->host ?? '';
        $this->api($host, $token, 'PATCH', '/domains/' . rawurlencode($service->name) . '/limits', $this->limits($package_to));
        return null;
    }
}
