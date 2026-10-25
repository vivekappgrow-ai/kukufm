import { useState } from "react";
import {
  ArrowRight, BadgeCheck, BookOpen, Check, ChevronDown, Download, Headphones,
  LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Video, X,
} from "lucide-react";
import { familyPlan, formatPlanPrice, monthlyPlan, plans, yearlyPlan, yearlySavingsPercent, type SubscriptionPlan } from "../data/plans";

type PaywallReason = "trial" | "lesson" | "ai" | "camera" | "downloads";

const paywallCopy: Record<PaywallReason, { title: string; detail: string }> = {
  trial: { title: "A little more room to learn", detail: "Review the trial and renewal terms below. Checkout is not enabled in this preview." },
  lesson: { title: "Keep listening, at your pace", detail: "Premium includes unlimited lessons. Your free daily lesson allowance stays available." },
  ai: { title: "More time with your study buddy", detail: "Premium adds more AI chat and voice learning time. The current app does not limit or send learner chat." },
  camera: { title: "A closer look, when you need it", detail: "Camera mode is a Premium feature and is not connected in this preview." },
  downloads: { title: "Take lessons offline", detail: "Offline downloads are a Premium feature and are not connected in this preview." },
};

const previewActions: { reason: PaywallReason; icon: JSX.Element; label: string }[] = [
  { reason: "lesson", icon: <BookOpen size={17} />, label: "Locked lesson" },
  { reason: "ai", icon: <MessageCircle size={17} />, label: "AI limit reached" },
  { reason: "camera", icon: <Video size={17} />, label: "Camera mode" },
  { reason: "downloads", icon: <Download size={17} />, label: "Offline downloads" },
];

function nextRenewalDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function PlanPrice({ plan }: { plan: SubscriptionPlan }) {
  return <span className="pricing-card-price">
    <strong>{plan.id === "free" ? "₹0" : `₹${plan.amount.toLocaleString("en-IN")}`}</strong>
    {plan.id !== "free" && <small>/{plan.interval}</small>}
  </span>;
}

export function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(yearlyPlan);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [coupon, setCoupon] = useState("");
  const [referral, setReferral] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");

  function preview(reason: PaywallReason, plan = selectedPlan) {
    setSelectedPlan(plan);
    setCheckoutNotice("");
    setPaywall(reason);
  }

  function submitCode(kind: "coupon" | "referral") {
    const code = kind === "coupon" ? coupon : referral;
    setCodeMessage(code.trim() ? "Code checks will be available when checkout is connected." : "Enter a code to continue.");
  }

  return <div className="pricing-page">
    <section className="pricing-hero">
      <div className="pricing-hero-copy">
        <span className="pricing-eyebrow"><Headphones size={15} /> A PARENT'S GUIDE TO MORE LEARNING</span>
        <h1>Seekhna ho gaya <em>aasan.</em></h1>
        <p>More thoughtful lessons, more ways to practise, and a little more space for every question.</p>
        <button className="pricing-cta" onClick={() => preview("trial", yearlyPlan)}>Preview the ₹1 trial <ArrowRight size={17} /></button>
        <span className="pricing-hero-note">Parent/guardian view · No payment is taken in this preview</span>
      </div>
      <div className="pricing-hero-art" aria-hidden="true">
        <span className="pricing-art-disc pricing-art-disc-back" />
        <span className="pricing-art-disc pricing-art-disc-front"><BookOpen size={46} /></span>
        <span className="pricing-art-note"><Sparkles size={15} /> Learn at your own pace</span>
      </div>
    </section>

    <section className="pricing-plans-section" aria-labelledby="plans-heading">
      <header className="pricing-section-heading">
        <div><span className="pricing-eyebrow">PLANS THAT FEEL SIMPLE</span><h2 id="plans-heading">Choose your learning rhythm</h2></div>
        <p>Every plan is clear about what it includes. Choose a plan to see the terms.</p>
      </header>
      <div className="pricing-plan-grid">
        {[monthlyPlan, yearlyPlan, familyPlan].map((plan) => <article key={plan.id} className={`pricing-plan-card${plan.highlighted ? " pricing-plan-featured" : ""}`}>
          {plan.highlighted && <span className="pricing-popular"><BadgeCheck size={14} /> BEST VALUE · SAVE {yearlySavingsPercent}%</span>}
          <span className="pricing-plan-icon">{plan.id === "family" ? <Headphones size={19} /> : <BookOpen size={19} />}</span>
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
          <PlanPrice plan={plan} />
          {plan.id === "yearly" && <span className="pricing-plan-equivalent">About ₹{(plan.amount / 12).toFixed(0)} per month, billed yearly</span>}
          <ul>{plan.features.slice(0, 5).map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
          <button className={plan.highlighted ? "pricing-plan-button featured" : "pricing-plan-button"} onClick={() => preview("trial", plan)}>See trial terms</button>
          <span className="pricing-plan-cancel">Cancel anytime from the parent account</span>
        </article>)}
      </div>
      <div className="pricing-trial-note"><ShieldCheck size={18} /><p><strong>₹1 mein 7 din Premium</strong><span>₹1 verification charge, then auto-renews at the plan price you choose. Renewal price and date are shown before payment. No countdown or hidden terms.</span></p></div>
    </section>

    <section className="pricing-comparison" aria-labelledby="comparison-heading">
      <header className="pricing-section-heading"><div><span className="pricing-eyebrow">AT A GLANCE</span><h2 id="comparison-heading">Free vs Premium</h2></div></header>
      <div className="pricing-table-wrap"><table>
        <thead><tr><th scope="col">Learning feature</th><th scope="col">Free</th><th scope="col">Premium</th></tr></thead>
        <tbody>
          {[
            ["Lessons", "1 per day", "Unlimited"],
            ["AI chat", "3 messages per day", "More AI learning time"],
            ["AI voice", "5 minutes per day", "More AI learning time"],
            ["Camera mode", "Not included", "Included"],
            ["Offline downloads", "Not included", "Included"],
            ["Learning progress", "Basic", "Detailed"],
          ].map(([feature, free, premium]) => <tr key={feature}><th scope="row">{feature}</th><td>{free}</td><td><Check size={15} />{premium}</td></tr>)}
        </tbody>
      </table></div>
    </section>

    <section className="pricing-tools">
      <div><span className="pricing-eyebrow">A CODE FROM US?</span><h2>Apply a code</h2><p>Code checks happen at checkout; this preview will not apply a discount.</p></div>
      <div className="pricing-code-fields">
        <form onSubmit={(event) => { event.preventDefault(); submitCode("coupon"); }}><label htmlFor="pricing-coupon">Coupon code</label><div><input id="pricing-coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Enter coupon" /><button type="submit">Apply</button></div></form>
        <form onSubmit={(event) => { event.preventDefault(); submitCode("referral"); }}><label htmlFor="pricing-referral">Referral code</label><div><input id="pricing-referral" value={referral} onChange={(event) => setReferral(event.target.value)} placeholder="Enter referral code" /><button type="submit">Apply</button></div></form>
        {codeMessage && <p className="pricing-code-message" role="status">{codeMessage}</p>}
      </div>
    </section>

    <section className="pricing-school-link"><span><strong>Looking for a school plan?</strong><small>We can help your school find a learning plan that fits.</small></span><button onClick={() => setCodeMessage("School plan enquiries are not connected in this preview.")}>Contact us <ArrowRight size={15} /></button></section>

    <section className="pricing-faq" aria-labelledby="faq-heading">
      <header className="pricing-section-heading"><div><span className="pricing-eyebrow">GOOD TO KNOW</span><h2 id="faq-heading">A few common questions</h2></div></header>
      {[
        ["What does the ₹1 trial mean?", "If checkout is enabled, the ₹1 charge verifies the payment method and starts 7 days of Premium. At the end of the trial, the selected plan renews at its stated price unless the parent cancels first. The exact renewal date and amount must be reviewed before payment."],
        ["Can I cancel whenever I want?", "Yes. The parent account will have a one-tap cancellation flow. Cancelling stops the next renewal; the current paid period remains available until it ends."],
        ["Will my child see payment prompts?", "Pricing and payment controls are intended for the parent account only. This preview has no payment flow; a parent PIN gate must be in place before real purchases are enabled."],
        ["Is payment connected here?", "No. This is a UI preview only. No card, UPI mandate, subscription, or payment is created from this page."],
      ].map(([question, answer], index) => <article className={`pricing-faq-item${faqOpen === index ? " open" : ""}`} key={question}>
        <button aria-expanded={faqOpen === index} onClick={() => setFaqOpen((open) => open === index ? null : index)}>{question}<ChevronDown size={18} /></button>
        {faqOpen === index && <p>{answer}</p>}
      </article>)}
    </section>

    <div className="pricing-trust-row"><span><ShieldCheck size={17} /><strong>Secure UPI payment</strong><small>When checkout is connected</small></span><span><X size={17} /><strong>Cancel anytime</strong><small>From the parent account</small></span><span><LockKeyhole size={17} /><strong>No ads</strong><small>Learning stays focused</small></span></div>

    <section className="pricing-preview-tools" aria-labelledby="preview-heading">
      <span className="pricing-eyebrow">PARENT PREVIEW</span><h2 id="preview-heading">Preview a locked-feature message</h2>
      <p>These sample controls are available on this parent page only. No child-facing purchase prompts are enabled.</p>
      <div>{previewActions.map(({ reason, icon, label }) => <button key={reason} onClick={() => preview(reason)}><span>{icon}</span><strong>{label}</strong><small><LockKeyhole size={12} /> Premium</small></button>)}</div>
    </section>

    {paywall && <div className="pricing-sheet-backdrop" role="presentation" onClick={() => setPaywall(null)}>
      <section className="pricing-sheet" role="dialog" aria-modal="true" aria-labelledby="pricing-sheet-title" onClick={(event) => event.stopPropagation()}>
        <button className="pricing-sheet-close" aria-label="Close" onClick={() => setPaywall(null)}><X size={18} /></button>
        <span className="pricing-sheet-icon"><LockKeyhole size={21} /></span>
        <span className="pricing-eyebrow">PARENT ACCOUNT · PREVIEW</span>
        <h2 id="pricing-sheet-title">{paywallCopy[paywall].title}</h2>
        <p>{paywallCopy[paywall].detail}</p>
        <label className="pricing-sheet-select">Choose a plan<select value={selectedPlan.id} onChange={(event) => {
          const plan = plans.find((item) => item.id === event.target.value);
          if (plan && plan.id !== "free") setSelectedPlan(plan);
        }}>{[monthlyPlan, yearlyPlan, familyPlan].map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {formatPlanPrice(plan)}</option>)}</select></label>
        <div className="pricing-renewal-box">
          <span>Today, if checkout is enabled<strong>₹1 verification charge</strong></span>
          <span>After 7 days · {nextRenewalDate()}<strong>{formatPlanPrice(selectedPlan)} auto-renewal</strong></span>
        </div>
        <p className="pricing-cancel-note"><Check size={14} /> Cancel anytime before renewal from the parent account.</p>
        <button className="pricing-cta pricing-sheet-cta" onClick={() => setCheckoutNotice("Checkout is not enabled in this preview. No payment was taken.")}>Continue to checkout preview <ArrowRight size={16} /></button>
        {checkoutNotice && <p className="pricing-checkout-notice" role="status">{checkoutNotice}</p>}
        <small className="pricing-no-payment">No payment or subscription is created. Parent PIN and live payment confirmation are required before purchase.</small>
      </section>
    </div>}
    <div className="pricing-mobile-cta"><button onClick={() => preview("trial", yearlyPlan)}>Start ₹1 trial <ArrowRight size={16} /></button><small>Renewal terms shown before any payment</small></div>
  </div>;
}
