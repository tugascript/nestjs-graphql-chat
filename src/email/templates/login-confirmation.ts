export const loginConfirmationEmail = (name: string, code: string) => `
<body>
  <p>Hello ${name},</p>
  <br />
  <p>Welcome back to Ephemeral Chats,</p>
  <p>
    Here's your login code:
    <b>${code}</b>
  </p>
  <p>
    <small>This code will expire in 5 minutes.</small>
  </p>
  <br />
  <p>Best regards,</p>
  <p>Afonso Barracha</p>
</body>
`;
