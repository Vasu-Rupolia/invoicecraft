<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $businessName }}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <p>Hello,</p>

        <div style="white-space: pre-line;">{{ $messageBody }}</div>

        <p>
            Please find the document attached to this email.
        </p>

        <p>
            Regards,<br>
            <strong>{{ $businessName }}</strong>
        </p>
    </div>
</body>
</html>