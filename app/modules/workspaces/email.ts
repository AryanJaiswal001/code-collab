import "server-only";

import nodemailer from "nodemailer";

type InviteEmailInput = {
  email: string;
  inviteUrl: string;
};

type SendInviteEmailsParams = {
  workspaceName: string;
  sentByName: string;
  invites: InviteEmailInput[];
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() ?? "", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const secure = process.env.SMTP_SECURE?.trim() === "true";

  if (!host || !port || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    from,
    auth:
      user && pass
        ? {
            user,
            pass,
          }
        : undefined,
  };
}

export function isInviteEmailConfigured() {
  return Boolean(getSmtpConfig());
}

export async function sendWorkspaceInviteEmails({
  workspaceName,
  sentByName,
  invites,
}: SendInviteEmailsParams) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig || !invites.length) {
    return {
      sentCount: 0,
      skipped: true,
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth,
  });

  await Promise.all(
    invites.map((invite) =>
      transporter.sendMail({
        from: smtpConfig.from,
        to: invite.email,
        subject: `${sentByName} invited you to ${workspaceName}`,
        text: [
          `${sentByName} invited you to join the "${workspaceName}" workspace.`,
          "",
          `Accept the invite: ${invite.inviteUrl}`,
        ].join("\n"),
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
            <p><strong>${sentByName}</strong> invited you to join <strong>${workspaceName}</strong>.</p>
            <p>
              <a href="${invite.inviteUrl}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none">
                Accept invite
              </a>
            </p>
            <p style="font-size:13px;color:#475569">${invite.inviteUrl}</p>
          </div>
        `,
      }),
    ),
  );

  return {
    sentCount: invites.length,
    skipped: false,
  };
}
