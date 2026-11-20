import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const h2 = "mt-8 font-display text-xl font-bold text-white";

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-3 text-sm leading-relaxed text-ink-300 [&_a]:text-neon-pink [&_a]:underline [&_li]:pl-1 [&_strong]:text-ink-100">
      <h1 className="font-display text-3xl font-bold text-white">Privacy Policy</h1>
      <p>Last updated: November 19, 2026</p>
      <p>
        This policy explains what the SethDrums Song Panel (&quot;the panel&quot;, &quot;we&quot;, &quot;us&quot;) collects
        when you use it, why, and who else is involved. The panel is run by SethDrum LLC, 104 Zion St., Anderson, MO
        64831, United States.
      </p>

      <h2 className={h2}>What we collect</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Your Twitch account basics</strong>, when you sign in with Twitch: your Twitch user id, username and
          profile picture. Twitch may also share your email address with our sign-in provider. We keep it only in your
          sign-in session and don&apos;t store it in our database.
        </li>
        <li>
          <strong>Song suggestions</strong> you make on the site, in Twitch or Kick chat: your username, your Twitch user
          id (for site and Twitch suggestions), the video you suggested, and when it was played.
        </li>
        <li>
          <strong>Saved songs</strong>: if you use <code>!save</code> in chat, the videos you saved, linked to your
          Twitch user id.
        </li>
        <li>
          <strong>Moderation records</strong>: if a mod bans you from suggesting, your Twitch user id and username, the
          reason, and which mod did it. Mods&apos; usernames are recorded on the PG checks they do.
        </li>
        <li>
          <strong>Basic visit statistics</strong> through Plausible Analytics, which counts page views without cookies and
          without identifying you.
        </li>
      </ul>
      <p>We don&apos;t sell your information, show ads, or use it for anything other than running the panel.</p>

      <h2 className={h2}>What other people can see</h2>
      <p>
        The suggestion list and the previously played page are public. They show the song, the username that suggested
        it, and when it was played. Your saved songs are only shown to you.
      </p>

      <h2 className={h2}>Cookies and local storage</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Sign-in cookies</strong>, set by our sign-in provider, Auth0, keep you signed in. They&apos;re needed for
          signing in and aren&apos;t used for tracking.
        </li>
        <li>
          <strong>Local storage</strong> remembers small display choices, such as how your saved songs are sorted. It
          stays in your browser.
        </li>
      </ul>
      <p>We don&apos;t use advertising or cross-site tracking cookies.</p>

      <h2 className={h2}>Services we rely on</h2>
      <p>These companies process data for us to make the panel work:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li><strong>Auth0</strong> (Okta): handles signing in.</li>
        <li><strong>Twitch</strong>: your account, and links to stream VODs on the played list.</li>
        <li>
          <strong>YouTube</strong> (Google): video details and embedded players. When a YouTube player loads, YouTube may
          set its own cookies under Google&apos;s privacy policy.
        </li>
        <li><strong>Pusher</strong>: live updates for the mod panel. Only mods connect to it.</li>
        <li><strong>Render</strong> and <strong>Cloudflare</strong>: hosting and network delivery.</li>
        <li><strong>Turso</strong> and <strong>Redis</strong>: where the panel&apos;s data is stored.</li>
        <li><strong>Plausible Analytics</strong>: privacy-friendly visit statistics.</li>
      </ul>

      <h2 className={h2}>How long we keep it</h2>
      <p>
        Suggestions and the played history are kept so the history page keeps working. Saved songs stay until you remove
        them. Ban records stay until a mod lifts the ban. Your sign-in session ends when you sign out or it expires.
      </p>

      <h2 className={h2}>Your choices</h2>
      <p>
        You can remove saved songs yourself on the My Songs page, and sign out at any time. To ask for a copy of your
        data, or to have your suggestions, saved songs or other records deleted, email us at the address below.
      </p>

      <h2 className={h2}>Children</h2>
      <p>
        The panel isn&apos;t meant for anyone under 13, which is also Twitch&apos;s minimum age. If you believe a child
        under 13 has given us information, contact us and we&apos;ll delete it.
      </p>

      <h2 className={h2}>Changes</h2>
      <p>If this policy changes, we&apos;ll update it here and change the date at the top.</p>

      <h2 className={h2}>Contact</h2>
      <p>
        Questions or requests: <a href="mailto:sethdrumstv@gmail.com">sethdrumstv@gmail.com</a>
      </p>
    </article>
  );
}
