import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms and Conditions" };

const h2 = "mt-8 font-display text-xl font-bold text-white";

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-3 text-sm leading-relaxed text-ink-300 [&_a]:text-neon-pink [&_a]:underline [&_li]:pl-1 [&_strong]:text-ink-100">
      <h1 className="font-display text-3xl font-bold text-white">Terms and Conditions</h1>
      <p>Last updated: November 19, 2026</p>
      <p>
        These terms cover your use of the SethDrums Song Panel (&quot;the panel&quot;), run by SethDrum LLC, 104 Zion St.,
        Anderson, MO 64831, United States. By using the panel you agree to them. If you don&apos;t agree, please don&apos;t
        use it.
      </p>

      <h2 className={h2}>What the panel is</h2>
      <p>
        The panel lets viewers suggest songs for SethDrums to play on stream, and lets Seth and his mods manage the
        suggestion list. It&apos;s free, and it&apos;s offered as is.
      </p>

      <h2 className={h2}>Suggestions</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>A suggestion is just that. Seth and the mods decide what gets played, in what order, and whether at all.</li>
        <li>
          Suggestions are checked to be suitable for stream. Mods may reject, remove or reorder any suggestion, without
          giving a reason.
        </li>
        <li>
          Don&apos;t suggest anything hateful, sexually explicit, or otherwise against Twitch&apos;s Community Guidelines,
          and don&apos;t use the panel to spam or harass anyone.
        </li>
        <li>Mods may ban users or videos from the panel, for example for breaking these rules or the stream&apos;s chat rules.</li>
      </ul>

      <h2 className={h2}>Your account</h2>
      <p>
        You sign in with your Twitch account, and Twitch&apos;s own terms apply to it. You&apos;re responsible for
        what&apos;s done with your account on the panel.
      </p>

      <h2 className={h2}>Videos and other content</h2>
      <p>
        Videos are played through YouTube&apos;s embedded player and belong to their owners. YouTube&apos;s Terms of
        Service apply when you watch them. The panel&apos;s own design, name and logos belong to SethDrum LLC.
      </p>

      <h2 className={h2}>Privacy</h2>
      <p>
        Our <Link href="/privacy-policy">Privacy Policy</Link> explains what we collect and how it&apos;s used.
      </p>

      <h2 className={h2}>No guarantees</h2>
      <p>
        We try to keep the panel running and accurate, but we don&apos;t promise it will always be available, error-free,
        or that any song will be played. To the extent the law allows, SethDrum LLC isn&apos;t liable for any loss that
        comes from using the panel or not being able to use it.
      </p>

      <h2 className={h2}>Changes</h2>
      <p>
        We may update these terms. When we do, we&apos;ll change the date at the top. Using the panel after a change means
        you accept the updated terms.
      </p>

      <h2 className={h2}>Governing law</h2>
      <p>These terms are governed by the laws of the State of Missouri, United States.</p>

      <h2 className={h2}>Contact</h2>
      <p>
        Questions: <a href="mailto:sethdrumstv@gmail.com">sethdrumstv@gmail.com</a>
      </p>
    </article>
  );
}
