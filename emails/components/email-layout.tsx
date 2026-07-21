/* eslint-disable @next/next/no-head-element, @next/next/no-img-element -- Transactional email markup requires literal document elements and absolute image URLs. */

import { render } from "@react-email/render";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { TransactionalEmailLocale } from "@/types/email-provider";

const colors = {
  background: "#f4f4f5",
  surface: "#ffffff",
  foreground: "#171717",
  muted: "#666666",
  border: "#e4e4e7",
  primary: "#171717",
  primaryForeground: "#ffffff",
  soft: "#f7f7f8",
  success: "#166534",
  successBackground: "#f0fdf4",
  successBorder: "#bbf7d0",
} as const;

const bodyStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  width: "100%",
  backgroundColor: colors.background,
  color: colors.foreground,
  fontFamily: "Arial, Helvetica, sans-serif",
};

const outerTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: colors.background,
};

const containerStyle: CSSProperties = {
  width: "100%",
  maxWidth: 640,
  margin: "0 auto",
};

const cardStyle: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  overflow: "hidden",
};

const contentStyle: CSSProperties = {
  padding: "36px 40px 40px",
};

const footerStyle: CSSProperties = {
  padding: "24px 32px 8px",
  color: colors.muted,
  fontSize: 12,
  lineHeight: "18px",
  textAlign: "center",
};

export type EmailLayoutProps = Readonly<{
  locale: TransactionalEmailLocale;
  previewText: string;
  logoUrl: string;
  brandUrl: string;
  brandName: string;
  footerText: string;
  children: ReactNode;
}>;

export function EmailLayout({
  locale,
  previewText,
  logoUrl,
  brandUrl,
  brandName,
  footerText,
  children,
}: EmailLayoutProps) {
  return (
    <html lang={locale}>
      <head>
        <meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>{previewText}</title>
      </head>
      <body style={bodyStyle}>
        <div
          aria-hidden="true"
          style={{
            display: "none",
            maxHeight: 0,
            maxWidth: 0,
            opacity: 0,
            overflow: "hidden",
            lineHeight: "1px",
          }}
        >
          {previewText}
        </div>
        <table
          cellPadding="0"
          cellSpacing="0"
          role="presentation"
          style={outerTableStyle}
          width="100%"
        >
          <tbody>
            <tr>
              <td style={{ padding: "32px 16px" }}>
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  role="presentation"
                  style={containerStyle}
                  width="100%"
                >
                  <tbody>
                    <tr>
                      <td style={cardStyle}>
                        <div
                          style={{
                            padding: "28px 40px 24px",
                            textAlign: "center",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <a
                            href={brandUrl}
                            style={{ display: "inline-block" }}
                          >
                            <img
                              alt={brandName}
                              height="101"
                              src={logoUrl}
                              style={{
                                display: "block",
                                height: "auto",
                                margin: "0 auto",
                                maxWidth: "100%",
                              }}
                              width="110"
                            />
                          </a>
                        </div>
                        <div style={contentStyle}>{children}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={footerStyle}>{footerText}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailEyebrow({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p
      style={{
        margin: "0 0 12px",
        color: colors.success,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        lineHeight: "18px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

export function EmailTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <h1
      style={{
        margin: "0 0 16px",
        color: colors.foreground,
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: "38px",
      }}
    >
      {children}
    </h1>
  );
}

export function EmailParagraph({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        color: colors.muted,
        fontSize: 15,
        lineHeight: "24px",
      }}
    >
      {children}
    </p>
  );
}

export function EmailSectionTitle({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <h2
      style={{
        margin: "0 0 16px",
        color: colors.foreground,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: "26px",
      }}
    >
      {children}
    </h2>
  );
}

export function EmailSection({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        margin: "24px 0 0",
        padding: 24,
        backgroundColor: colors.soft,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  );
}

export function EmailSuccessNote({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        margin: "24px 0 0",
        padding: "14px 16px",
        backgroundColor: colors.successBackground,
        border: `1px solid ${colors.successBorder}`,
        borderRadius: 12,
        color: colors.success,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: "22px",
      }}
    >
      {children}
    </div>
  );
}

export type EmailDetailRowProps = Readonly<{
  label: string;
  value: ReactNode;
  last?: boolean;
}>;

export function EmailDetailRow({
  label,
  value,
  last = false,
}: EmailDetailRowProps) {
  return (
    <table
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      style={{
        width: "100%",
        borderCollapse: "collapse",
        borderBottom: last ? "none" : `1px solid ${colors.border}`,
      }}
      width="100%"
    >
      <tbody>
        <tr>
          <td
            style={{
              width: "42%",
              padding: "11px 12px 11px 0",
              color: colors.muted,
              fontSize: 13,
              lineHeight: "20px",
              verticalAlign: "top",
            }}
          >
            {label}
          </td>
          <td
            style={{
              padding: "11px 0",
              color: colors.foreground,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              textAlign: "right",
              verticalAlign: "top",
              wordBreak: "break-word",
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailButton({
  href,
  children,
}: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <div style={{ margin: "28px 0 8px", textAlign: "center" }}>
      <a
        href={href}
        style={{
          display: "inline-block",
          padding: "13px 22px",
          backgroundColor: colors.primary,
          borderRadius: 999,
          color: colors.primaryForeground,
          fontSize: 14,
          fontWeight: 700,
          lineHeight: "20px",
          textDecoration: "none",
        }}
      >
        {children}
      </a>
    </div>
  );
}

export async function renderEmailDocument(
  element: ReactElement,
): Promise<string> {
  return render(element);
}
