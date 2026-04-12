/**
 * Resend optionally imports `@react-email/render` for React email templates.
 * Nitro must resolve that import when bundling for Cloudflare; we only send HTML
 * strings, so this stub satisfies the bundler. Using `email.react` would throw at runtime.
 */
export async function render(): Promise<string> {
  throw new Error(
    'React email templates are not supported in this app. Send HTML via the html field instead.'
  )
}
