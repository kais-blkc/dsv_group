<?php
/**
 * Обработчик заявок сайта DSV Group.
 * Принимает AJAX POST (заголовок X-Requested-With: XMLHttpRequest), отправляет письмо
 * и (по желанию) создаёт лид в Битрикс24.
 * Ответ: «1» — успех, «2» — успех и нужна страница «спасибо» (пришёл параметр thank_you), «0» (HTTP 500) — ошибка.
 */

if (
    $_SERVER['REQUEST_METHOD'] !== 'POST' ||
    empty($_SERVER['HTTP_X_REQUESTED_WITH']) ||
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest'
) {
    http_response_code(400);
    die('error');
}

// ===== НАСТРОЙКИ — заполнить вручную =====
// TODO: проверить адреса. Взяты с сайта (mail@dsv-group.ru) и домена dsv-group.ru.
define('SND_FROM', 'no-reply@dsv-group.ru'); // от кого уходит письмо (ящик на домене сайта, иначе письма попадут в спам)
define('SND_TO', 'mail@dsv-group.ru'); // кому — можно несколько через запятую
define('SND_NAME', 'DSV Group'); // имя отправителя
define('SITE_NAME', 'DSV Group'); // название сайта в теме и заголовке письма
define('CALLBACK_MINUTES', 10); // обещание на сайте: «менеджер перезвонит в течение 10 минут»

// SMTP (если false — письма идут через mail() сервера)
define('SMTP', false);
define('SMTP_HOST', ''); // TODO: например smtp.yandex.ru
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl'); // 'ssl', 'tls' или '' без шифрования
define('SMTP_AUTH', true);
define('SMTP_USER', ''); // TODO
define('SMTP_PASSWORD', ''); // TODO

// Битрикс24: true — создавать лиды (нужно заполнить bx/settings.php)
define('SND_TO_BITRIX', false);

// Тестовый режим без отправки: LEADS_DRY_RUN=1 php -S localhost:8000 — заявки пишутся в php/logs/leads.log
define('DRY_RUN', getenv('LEADS_DRY_RUN') === '1');

$path = dirname(__FILE__);
require $path . '/Hellper.php';

// Структура: 'имя_поля_формы' => [подпись в письме, заголовок, значение]
$fields = [
    'phone' => ['Номер телефона', 'Phone', false],
    'form_title' => ['Форма (заголовок)', 'Form title', false],
    'form_button' => ['Текст на кнопке', 'Button text', false],
    'product' => ['Карточка / модель, с которой оставлена заявка', 'Product', false],
    'quiz_shape' => ['Квиз: форма бани', 'Quiz shape', false],
    'quiz_people' => ['Квиз: сколько человек будут париться', 'Quiz people', false],
    'quiz_rooms' => ['Квиз: количество отделений', 'Quiz rooms', false],
    'quiz_when' => ['Квиз: когда установка', 'Quiz when', false],
    'quiz_via' => ['Квиз: куда прислать расчёт', 'Quiz via', false],
    'page_url' => ['Url страницы, с которой пришла заявка', 'Page URL', false],
    'utm_source' => ['Источник трафика', 'utm_source', false],
    'utm_medium' => ['Тип рекламы', 'utm_medium', false],
    'utm_campaign' => ['Рекламная кампания', 'utm_campaign', false],
    'utm_content' => ['Объявление', 'utm_content', false],
    'utm_term' => ['Ключевое слово', 'utm_term', false],
    'device_type' => ['Тип устройства', 'device_type', false],
];

/** Очистка значения из запроса: без тегов, обрезка, ограничение длины */
function cleanValue($value)
{
    if (is_array($value)) {
        return '';
    }
    return mb_substr(trim(strip_tags((string) $value)), 0, 500);
}

$thankYouPage = false;
foreach ($_POST as $reqFieldName => $value) {
    if ($reqFieldName == 'thank_you') {
        $thankYouPage = true;
        continue;
    }
    if (isset($fields[$reqFieldName])) {
        $fields[$reqFieldName][2] = cleanValue($value);
    }
}

// Телефон обязателен: 11 цифр
$digits = preg_replace('/\D/', '', (string) $fields['phone'][2]);
if (strlen($digits) < 11) {
    http_response_code(422);
    die('error');
}

foreach ($fields as $key => $val) {
    if ($fields[$key][2] === false || $fields[$key][2] === '') {
        $fields[$key][2] = '-';
    }
}

// Группы полей в письме
$groups = [
    '1) Информация, указанная посетителем сайта:' => [
        'fields' => ['phone', 'product', 'quiz_shape', 'quiz_people', 'quiz_rooms', 'quiz_when', 'quiz_via'],
        'html' => '',
    ],
    '2) Информация из рекламной системы:' => [
        'fields' => ['page_url', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'device_type'],
        'html' => '',
    ],
    '3) Кастомная информация:' => [
        'fields' => ['form_title', 'form_button'],
        'html' => '',
    ],
];

foreach ($fields as $key => $val) {
    if ($val[2] === '-') {
        continue;
    }
    foreach ($groups as $title => $group) {
        if (in_array($key, $group['fields'])) {
            $groups[$title]['html'] .=
                '<p><strong>' .
                htmlspecialchars($val[0], ENT_QUOTES, 'UTF-8') .
                ':</strong> ' .
                htmlspecialchars($val[2], ENT_QUOTES, 'UTF-8') .
                "</p>\r\n";
        }
    }
}

$headers = 'From: <' . SND_FROM . '>' . "\r\n";
$headers .= 'Reply-To: ' . SND_FROM . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html;charset=utf-8;\r\n";
$headers .= "X-Priority: 3\r\n";
$headers .= 'X-Mailer: PHP' . phpversion() . "\r\n";

$subject = 'Заявка с сайта «' . SITE_NAME . '»';

$htmlBody = "<html><body style='font-family:Arial,sans-serif;'>";
$htmlBody .= '<h2>Вам поступила новая заявка с сайта «' . SITE_NAME . "»</h2>\r\n";

foreach ($groups as $sectionTitle => $value) {
    if (empty($value['html'])) {
        continue;
    }
    $htmlBody .=
        '<h3 style="font-size: 15px; font-weight: normal; font-style: italic; padding: 3px 7px; background: rgba(0,0,0,0.1);">' .
        $sectionTitle .
        '</h3>';
    $htmlBody .= $value['html'];
}

$htmlBody .=
    '<p style="font-style: italic; padding: 10px 0 0 0;">Свяжитесь с клиентом в течение ' .
    CALLBACK_MINUTES .
    ' минут!</p>';
$htmlBody .= '</body></html>';

$goodStatus = $thankYouPage ? 2 : 1;

// --- Битрикс24 (по умолчанию выключен) ---
try {
    if (SND_TO_BITRIX && !DRY_RUN) {
        require_once __DIR__ . '/../bx/crest.php';

        $comments = [];
        foreach (['product', 'quiz_shape', 'quiz_people', 'quiz_rooms', 'quiz_when', 'quiz_via', 'form_title', 'page_url'] as $k) {
            if ($fields[$k][2] !== '-') {
                $comments[] = $fields[$k][0] . ': ' . $fields[$k][2];
            }
        }

        CRest::call('crm.lead.add', [
            'fields' => [
                'TITLE' => 'Заявка с сайта ' . SITE_NAME . ': ' . $fields['phone'][2],
                'NAME' => '',
                'STATUS_ID' => 'NEW',
                'OPENED' => 'Y',
                'SOURCE_ID' => 'WEB',
                'PHONE' => [['VALUE' => trim($fields['phone'][2]), 'VALUE_TYPE' => 'WORK']],
                'COMMENTS' => implode("\n", $comments),
                // Стандартные UTM-поля лида
                'UTM_SOURCE' => $fields['utm_source'][2] === '-' ? '' : $fields['utm_source'][2],
                'UTM_MEDIUM' => $fields['utm_medium'][2] === '-' ? '' : $fields['utm_medium'][2],
                'UTM_CAMPAIGN' => $fields['utm_campaign'][2] === '-' ? '' : $fields['utm_campaign'][2],
                'UTM_CONTENT' => $fields['utm_content'][2] === '-' ? '' : $fields['utm_content'][2],
                'UTM_TERM' => $fields['utm_term'][2] === '-' ? '' : $fields['utm_term'][2],
                // TODO: ответственный и пользовательские поля в новом Битриксе будут другими.
                // В старом проекте были: ASSIGNED_BY_ID => 1, UF_CRM_1650794493, UF_CRM_PROPERTY_NOVOE_POLE,
                // UF_CRM_1665128109 (страна/регион/город по IP), UF_CRM_1650794545 (utm_source).
                // 'ASSIGNED_BY_ID' => 0,
            ],
            'params' => ['REGISTER_SONET_EVENT' => 'Y'],
        ]);
    }
} catch (Exception $e) {
    error_log('bitrix: ' . $e->getMessage());
}

// --- Письмо ---
if (DRY_RUN) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }
    file_put_contents($logDir . '/leads.log', date('c') . "\n" . strip_tags(str_replace('</p>', "\n", $htmlBody)) . "\n----\n", FILE_APPEND);
    echo $goodStatus;
    exit;
}

// Письмо клиенту не отправляем: на сайте нет поля email (шаблон customerEmailTPL.php не подключён)
if (mailer(SND_TO, $subject, $htmlBody, $headers)) {
    echo $goodStatus;
} else {
    http_response_code(500);
    echo 0;
}
