# SURI Manual Entry Portal

Static web form for adding influencers to the SURI sheet manually. Drag-drop screenshots, fill handle + platform + market + owner, submit. Backend is the n8n W4 workflow `SURI Intake: Manual Entry` (id `osAvFVbD3eiANCDL`).

## Setup

1. **Pick a shared secret.** Any random string, e.g. `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
2. **In n8n**, open the W4 workflow, click `Auth Check`, and replace `REPLACE_ME_WITH_SHARED_SECRET` with that secret. Save and **activate** the workflow.
3. **Get the production webhook URL** from the `Manual Entry Webhook` node in n8n (it appears after the workflow is activated). Looks like `https://<your-instance>.app.n8n.cloud/webhook/manual-entry`.
4. **Edit `app.js`** in this directory:
   - Set `CONFIG.WEBHOOK_URL` to the URL from step 3.
   - Set `CONFIG.API_KEY` to the secret from step 1.
5. **Push to GitHub Pages.** Create a new repo, push the contents of this directory, then enable Pages on the `main` branch. The page will be live at `https://<org-or-user>.github.io/<repo-name>/`.
6. Share the GitHub Pages URL with the influencer team.

## Files

- `index.html` — the form
- `styles.css` — styling
- `app.js` — submission logic + dropzone + config

## How it works

1. Team member opens the page, fills the form, drops screenshots.
2. Submit → `POST` multipart/form-data to the n8n webhook with `X-API-Key` header.
3. W4 validates the secret, uploads each file to Cloudinary, sends every image through Claude vision (via the existing W2b extractor), merges results, builds a synthetic pipeline payload with `_manualEntry: true`, and routes to W3-IG / W3-YT / W3-SS.
4. W3 runs its existing flow (Apify or YouTube lookup, sheet write) but skips the dedup gate, the manual-triage gate, and the 25K threshold because of the bypass flag.
5. W3 posts a Slack confirmation when the row is added (or any other status).
6. Webhook responds 200 to the page; the page shows a success message.

## Notes

- The `X-API-Key` secret is in the static JS, so anyone with the page URL can read it. Keep the URL internal.
- For stronger access control later, put Cloudflare Access in front of the GitHub Pages URL (Google login required to view).
- Cloudinary uploads use the unsigned `ml_default` preset — same one used in the existing W2 pipeline.
- File size cap is 10 MB per file (Cloudinary free tier). Adjust in `app.js` (`CONFIG.MAX_FILE_BYTES`) if needed.
