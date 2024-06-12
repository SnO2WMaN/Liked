import { Hono } from "hono";
import z from "zod";
import ky from "ky";
import { jsxRenderer } from "hono/jsx-renderer";
import { html } from "hono/html";

const app = new Hono();
 
export const renderer = jsxRenderer(({ children }) => {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://unpkg.com/htmx.org@1.9.3"></script>
        <script src="https://unpkg.com/hyperscript.org@0.9.9"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <title>I LIKED THIS</title>
      </head>
      <body>
        <div class="p-4"> 
          ${children}
        </div>
      </body>
    </html>
  `;
});

app.get("*", renderer);
app.get("/", async (c) => {
  return c.render(
    <div>
      <form hx-post="/api/parse">
        <textarea name="input" rows={20} cols={80}></textarea>
        <button type="submit">
          Submit
        </button>
      </form>
    </div>,
  );
});

const tw = z.object({
  tweetID: z.string(),
  tweetURL: z.string(),
  media_extended: z.array(z.object({
    url: z.string().url(),
    altText: z.string().nullable(),
  })),
  text: z.string(), // ツイート本文
  user_name: z.string(), // プロフィール名
  user_screen_name: z.string(), // `@`以下
  user_profile_image_url: z.string().url(),
});

app.post("/api/parse", async (c) => {
  const a = await c.req.formData();
  const lines = a.get("input");
  if (!lines)
    return c.status(400);

  const ids = lines
    .split("\n")
    .map(line => line.trimStart())
    .map(line => line.match(/^https:\/\/x.com\/(.+)\/status\/(\d+)$/))
    .filter(a => a !== null).map(a => a![2]);
  const okes = [];
  for (const id of ids) {
    const a = await ky.get(`https://api.vxtwitter.com/Twitter/status/${id}`, { timeout: 2000, throwHttpErrors: false });
    const j = await a.json().catch(e => null);
    const parsed = tw.safeParse(j);
    if (!parsed.success) {
      console.log("error!", id);
      continue;
    }
    const { text, tweetURL, user_name, user_screen_name, user_profile_image_url, media_extended } = parsed.data;

    console.log(id, media_extended);
    okes.push([
     `> [${user_profile_image_url}] ${user_name}([@${user_screen_name}])`,
     ...text.split("\n").map(t => ` > ${t}`),
     ...(media_extended.length >= 1 ? media_extended.map(({ url, altText }) => ` > [${url}]${altText !== null ? `(${altText})` : ""}`) : []),
     ` > ${tweetURL}`,

    ].join("\n"));
  }
  console.log(okes.join("\n"));
  return c.text("OK");
});

export default app;
