const notificationTemplate = ({
  title,
  message,
  buttonText = "Ouvrir l'application",
  buttonUrl = "https://briconnect.fr",
}) => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="
background:#ffffff;
border-radius:20px;
padding:40px;
box-shadow:0 4px 20px rgba(0,0,0,0.06);
">

<tr>
<td align="center">

<img
src="https://briconnect.fr/logo.png"
width="120"
style="margin-bottom:30px;"
/>

<h1 style="
margin:0;
font-size:28px;
color:#111827;
font-weight:700;
">
${title}
</h1>

<p style="
margin-top:24px;
font-size:16px;
line-height:28px;
color:#4b5563;
">
${message}
</p>

<a
href="${buttonUrl}"
style="
display:inline-block;
margin-top:30px;
background:#ff6b35;
color:white;
text-decoration:none;
padding:16px 28px;
border-radius:12px;
font-weight:600;
font-size:16px;
"
>
${buttonText}
</a>

<p style="
margin-top:40px;
font-size:13px;
color:#9ca3af;
line-height:22px;
">
Cet email a été envoyé automatiquement par Briconnect.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};

module.exports = notificationTemplate;