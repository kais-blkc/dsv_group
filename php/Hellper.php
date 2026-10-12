<?php
$path = dirname(__FILE__);
require $path . '/PHPMailer/src/Exception.php';
require $path . '/PHPMailer/src/PHPMailer.php';
require $path . '/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

/**
 * Отправка письма через PHPMailer.
 * Настройки SMTP — константы SMTP_* в formProcessor.php.
 */
function mailer($sendto, $subject, $htmlBody, $headers = false)
{
    try {
        $phpmailer = new PHPMailer(true);

        if (SMTP) {
            $phpmailer->isSMTP();
            $phpmailer->Host = SMTP_HOST;
            $phpmailer->SMTPAuth = SMTP_AUTH;
            $phpmailer->Port = SMTP_PORT;
            $phpmailer->Username = SMTP_USER;
            $phpmailer->Password = SMTP_PASSWORD;
            if (SMTP_SECURE !== '') {
                $phpmailer->SMTPSecure = SMTP_SECURE; // 'tls' или 'ssl'
            }
        }

        $phpmailer->setFrom(SND_FROM, SND_NAME);

        foreach (explode(',', $sendto) as $address) {
            $phpmailer->addAddress(trim($address));
        }

        $phpmailer->addReplyTo(SND_FROM, SND_NAME);

        $phpmailer->isHTML(true);
        $phpmailer->Subject = $subject;
        $phpmailer->Body = $htmlBody;
        $phpmailer->CharSet = 'UTF-8';
        $phpmailer->AltBody = str_replace(
            ['<br>', '<br/>', '<BR>', '<BR/>'],
            "\r\n",
            strip_tags($htmlBody, '<br>')
        );
        $phpmailer->send();
        return true;
    } catch (Exception $e) {
        error_log('mailer: ' . $e->getMessage());
        return false;
    }
}

/** Рендер PHP-шаблона в строку (для письма клиенту, сейчас не используется) */
function fileContentsToVar($file, $data)
{
    extract($data);
    ob_start();
    require $file;
    return ob_get_clean();
}
