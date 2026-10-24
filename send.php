<?php
// Обработчик заявки с сайта Проект-Комплект.
// Принимает данные формы и файлы и отправляет письмо с вложениями на почту хостинга.
declare(strict_types=1);

// ==== НАСТРОЙКИ ====
const MAIL_TO     = 'info@projectbox.pro';   // куда приходят заявки
const MAIL_FROM   = 'site@projectbox.pro';   // адрес отправителя на вашем домене (создайте в панели хостинга)
const MAX_FILE_MB = 10;                      // максимум на один файл
const MAX_FILES   = 5;                       // максимум файлов в заявке
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'zip'];
const RATE_LIMIT  = 5;                       // заявок с одного IP...
const RATE_WINDOW = 600;                     // ...за столько секунд

header('Content-Type: application/json; charset=utf-8');

function reply(bool $ok, string $msg, int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(false, 'Метод не поддерживается.', 405);
}

// Ловушка для ботов: скрытое поле должно остаться пустым
if (!empty($_POST['website'])) {
    reply(true, 'Заявка отправлена.');
}

$name    = trim((string)($_POST['name'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$about   = trim((string)($_POST['about'] ?? ''));
$survey  = trim((string)($_POST['survey'] ?? ''));
$privacy = !empty($_POST['privacy']);

// Убираем переводы строк из имени, чтобы нельзя было подмешать заголовки
$name = str_replace(["\r", "\n"], ' ', $name);

// Лимиты в байтах (UTF-8): не требуют расширения mbstring
if (strlen($name) > 600 || strlen($about) > 30000 || strlen($survey) > 90000) {
    reply(false, 'Текст слишком длинный.', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(false, 'Укажите корректную электронную почту.', 400);
}
if (!$privacy) {
    reply(false, 'Нужно согласие на обработку персональных данных.', 400);
}

// Ограничение частоты с одного адреса
$rlFile = sys_get_temp_dir() . '/pk_rl_' . md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$hits = [];
if (is_file($rlFile)) {
    $hits = array_filter(
        array_map('intval', explode("\n", (string)file_get_contents($rlFile))),
        static fn(int $t): bool => $t > time() - RATE_WINDOW
    );
}
if (count($hits) >= RATE_LIMIT) {
    reply(false, 'Слишком много заявок. Попробуйте чуть позже.', 429);
}
$hits[] = time();
@file_put_contents($rlFile, implode("\n", $hits));

// Файлы
$attachments = [];
if (!empty($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
    $count = count($_FILES['attachments']['name']);
    if ($count > MAX_FILES) {
        reply(false, 'Можно приложить не больше ' . MAX_FILES . ' файлов.', 400);
    }
    for ($i = 0; $i < $count; $i++) {
        $err = $_FILES['attachments']['error'][$i];
        if ($err === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $orig = basename((string)$_FILES['attachments']['name'][$i]);
        if ($err !== UPLOAD_ERR_OK) {
            reply(false, 'Файл не загрузился: ' . $orig . '. Попробуйте меньший размер.', 400);
        }
        $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_EXT, true)) {
            reply(false, 'Этот тип файла не принимается: ' . $orig, 400);
        }
        if ((int)$_FILES['attachments']['size'][$i] > MAX_FILE_MB * 1024 * 1024) {
            reply(false, 'Файл больше ' . MAX_FILE_MB . ' МБ: ' . $orig, 400);
        }
        $attachments[] = [
            'orig' => $orig,
            'ext'  => $ext,
            'path' => $_FILES['attachments']['tmp_name'][$i],
        ];
    }
}

// Текст письма
$text = "Имя: $name\r\nПочта: $email\r\n\r\nКратко о проекте:\r\n$about\r\n";
if ($survey !== '') {
    $text .= "\r\n--- Ответы опросника ---\r\n$survey\r\n";
}
if ($attachments) {
    $text .= "\r\nВложения:\r\n";
    foreach ($attachments as $n => $a) {
        $text .= '  ' . ($n + 1) . '. ' . $a['orig'] . "\r\n";
    }
}

// Сборка письма с вложениями (MIME)
$boundary = 'pk_' . bin2hex(random_bytes(12));
$subjText = 'Заявка с сайта Проект-Комплект' . ($name !== '' ? ': ' . $name : '');
$subject  = '=?UTF-8?B?' . base64_encode($subjText) . '?=';

$msg  = "--$boundary\r\n";
$msg .= "Content-Type: text/plain; charset=UTF-8\r\n";
$msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
$msg .= chunk_split(base64_encode($text)) . "\r\n";

foreach ($attachments as $n => $a) {
    // В заголовке файла используем простое ASCII-имя, оригинал указан в тексте письма
    $asciiName = 'zayavka-' . ($n + 1) . '.' . $a['ext'];
    $msg .= "--$boundary\r\n";
    $msg .= "Content-Type: application/octet-stream; name=\"$asciiName\"\r\n";
    $msg .= "Content-Disposition: attachment; filename=\"$asciiName\"\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $msg .= chunk_split(base64_encode((string)file_get_contents($a['path']))) . "\r\n";
}
$msg .= "--$boundary--\r\n";

$headers  = 'From: ' . MAIL_FROM . "\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

if (!mail(MAIL_TO, $subject, $msg, $headers)) {
    reply(false, 'Не удалось отправить заявку. Напишите на info@projectbox.pro.', 500);
}

reply(true, 'Заявка отправлена.');
