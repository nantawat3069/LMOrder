<?php
function uploadToCloudinary($filePath, $fileName) {
    $cloudName = getenv('CLOUDINARY_CLOUD_NAME');
    $apiKey    = getenv('CLOUDINARY_API_KEY');
    $apiSecret = getenv('CLOUDINARY_API_SECRET');

    $timestamp = time();
    
    $params_to_sign = "folder=lmorder&timestamp=$timestamp";
    $signature = sha1($params_to_sign . $apiSecret);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.cloudinary.com/v1_1/$cloudName/image/upload");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        'file'      => new CURLFile($filePath),
        'api_key'   => $apiKey,
        'timestamp' => $timestamp,
        'signature' => $signature,
        'folder'    => 'lmorder'
    ]);

    $result = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($result, true);
    return $data['secure_url'] ?? null;
}
?>