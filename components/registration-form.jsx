"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, LoaderCircle, LockKeyhole, Send } from "lucide-react";

const initialValues = {
  fullName: "", email: "", phone: "", city: "",
  vehicleMake: "", vehicleModel: "", vehicleYear: "",
  experience: "", teamName: "", notes: "", website: "", consent: false,
};
const driverFields = ["fullName", "email", "phone", "city"];

/* ── Custom Select ─────────────────────────────────────────────── */
function CustomSelect({ id, name, value, onChange, disabled, options, placeholder, required, ariaInvalid, ariaDescribedby }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function select(val) {
    onChange({ target: { name, value: val } });
    setOpen(false);
  }

  const selected = options.find(o => o.value === value);

  return (
    <div
      className={"custom-select" + (open ? " open" : "") + (value ? " has-value" : "") + (ariaInvalid ? " invalid" : "")}
      ref={ref}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedby}
    >
      {/* Hidden native input for form validity */}
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        id={id}
        className="custom-select-trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "cs-value" : "cs-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className="cs-chevron" />
      </button>
      {open && (
        <ul className="custom-select-dropdown" role="listbox" aria-label={placeholder}>
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={"cs-option" + (value === opt.value ? " selected" : "")}
              onMouseDown={() => select(opt.value)}
            >
              {value === opt.value && <Check size={13} className="cs-check" />}
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Main Form ─────────────────────────────────────────────────── */
export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [retryPending, setRetryPending] = useState(false);
  const idempotencyKey = useRef(null);
  const pendingPayload = useRef(null);
  const heading = useRef(null);
  const form = useRef(null);
  const focusAfterUpdate = useRef(null);

  useEffect(() => {
    if (!focusAfterUpdate.current) return;
    const target = focusAfterUpdate.current;
    focusAfterUpdate.current = null;
    const element = target === "heading" ? heading.current : form.current?.elements.namedItem(target);
    element?.focus();
  }, [step, receipt, fieldErrors]);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setValues(current => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (fieldErrors[name]) setFieldErrors(current => ({ ...current, [name]: undefined }));
    if (error && !retryPending) setError("");
  }

  function fieldProps(name) {
    return {
      id: `registration-${name}`, name, value: values[name], onChange: update,
      disabled: submitting || retryPending,
      "aria-invalid": Boolean(fieldErrors[name]),
      "aria-describedby": fieldErrors[name] ? `registration-${name}-error` : undefined,
    };
  }

  function fieldError(name) {
    return fieldErrors[name]
      ? <span className="field-error" id={`registration-${name}-error`}>{fieldErrors[name]}</span>
      : null;
  }

  function changeStep(nextStep) {
    focusAfterUpdate.current = "heading";
    setStep(nextStep);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    if (step === 1) {
      if (form.current?.reportValidity()) changeStep(2);
      return;
    }
    // Validate custom selects
    if (!values.experience) {
      setFieldErrors(e => ({ ...e, experience: "Please select your offroad experience level." }));
      return;
    }
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
      const payload = pendingPayload.current || { ...values, idempotencyKey: idempotencyKey.current };
      pendingPayload.current = payload;
      const response = await fetch("/api/registrations", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && typeof data?.reference === "string") {
        focusAfterUpdate.current = "heading";
        setReceipt(data);
        setRetryPending(false);
        return;
      }
      if (response.status >= 500 || response.ok) {
        setRetryPending(true);
        setError("We couldn't confirm receipt just yet. Your details are kept in this open form. Retry the same application below to avoid a duplicate.");
        return;
      }
      pendingPayload.current = null;
      setRetryPending(false);
      setError(data?.error || "Your application could not be submitted. Please check your details and try again.");
      if (data?.fieldErrors) {
        const errors = data.fieldErrors;
        setFieldErrors(errors);
        const firstDriverError = driverFields.find(name => errors[name]);
        const firstField = firstDriverError || Object.keys(errors).find(name => name in initialValues && name !== "website");
        if (firstDriverError) setStep(1);
        focusAfterUpdate.current = firstField || "heading";
      }
    } catch {
      setRetryPending(true);
      setError("The connection was interrupted. Keep this page open and retry below. We'll reuse your submission reference to avoid a duplicate application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className="registration-card success-panel" role="status">
        <span className="success-icon"><CheckCheck size={32} aria-hidden="true" /></span>
        <p className="eyebrow">APPLICATION RECEIVED</p>
        <h3 ref={heading} tabIndex={-1}>YOU'RE ON OUR RADAR.</h3>
        <p>Thanks, {values.fullName.trim().split(" ")[0]}. Your ROVX–Bhaderwah 26 application has been received.</p>
        <div className="reference"><span>Your application reference</span><strong>{receipt.reference}</strong></div>
        <p>Save this reference. Your race entry is subject to organizer review. No payment has been collected.</p>
        <p className="form-note">13 December 2026 · Bhaderwah · Entry fee: ₹3,500 (to be collected on confirmation).</p>
      </div>
    );
  }

  const experienceOptions = [
    { value: "first-timer", label: "First-timer" },
    { value: "enthusiast", label: "Offroad enthusiast" },
    { value: "experienced", label: "Experienced driver" },
  ];

  return (
    <div className="registration-card" id="participant-registration">
      <div className="form-progress" aria-label={`Step ${step} of 2`}>
        <span className={step === 1 ? "active" : "complete"} aria-current={step === 1 ? "step" : undefined}>
          <b>{step > 1 ? <Check size={14} aria-hidden="true" /> : "01"}</b> THE DRIVER
        </span>
        <span className={step === 2 ? "active" : ""} aria-current={step === 2 ? "step" : undefined}>
          <b>02</b> THE MACHINE
        </span>
      </div>
      <div className="form-heading">
        <h3 ref={heading} tabIndex={-1}>{step === 1 ? "LET'S MEET THE DRIVER." : "TELL US ABOUT YOUR RIDE."}</h3>
        <p>{step === 1 ? "Your first step to the start line. All fields below are required." : "Bring your machine. Entry fee: ₹3,500. Fields marked * are required."}</p>
      </div>
      <form ref={form} onSubmit={submit} aria-busy={submitting}>
        {step === 1 ? (
          <div className="form-grid">
            <label className="full" htmlFor="registration-fullName">Full name *<input {...fieldProps("fullName")} autoComplete="name" placeholder="Your name" minLength={2} maxLength={100} required />{fieldError("fullName")}</label>
            <label htmlFor="registration-email">Email address *<input {...fieldProps("email")} type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required />{fieldError("email")}</label>
            <label htmlFor="registration-phone">Phone number *<input {...fieldProps("phone")} type="tel" autoComplete="tel" placeholder="+91 98765 43210" pattern={"\\+?[0-9\\(\\) .\\-]{8,30}"} minLength={8} maxLength={30} required />{fieldError("phone")}</label>
            <label className="full" htmlFor="registration-city">City *<input {...fieldProps("city")} autoComplete="address-level2" placeholder="Where are you driving in from?" minLength={2} maxLength={100} required />{fieldError("city")}</label>
          </div>
        ) : (
          <div className="form-grid">
            <label htmlFor="registration-vehicleMake">Vehicle make *<input {...fieldProps("vehicleMake")} autoComplete="off" placeholder="e.g. Mahindra" maxLength={80} required />{fieldError("vehicleMake")}</label>
            <label htmlFor="registration-vehicleModel">Vehicle model *<input {...fieldProps("vehicleModel")} autoComplete="off" placeholder="e.g. Thar" maxLength={80} required />{fieldError("vehicleModel")}</label>
            <label htmlFor="registration-vehicleYear">Model year *<input {...fieldProps("vehicleYear")} type="number" inputMode="numeric" placeholder="2024" min={1950} max={2027} step={1} required />{fieldError("vehicleYear")}</label>
            <label htmlFor="registration-experience">Offroad experience *
              <CustomSelect
                id="registration-experience"
                name="experience"
                value={values.experience}
                onChange={update}
                disabled={submitting || retryPending}
                options={experienceOptions}
                placeholder="Select experience level"
                required
                ariaInvalid={Boolean(fieldErrors.experience)}
                ariaDescribedby={fieldErrors.experience ? "registration-experience-error" : undefined}
              />
              {fieldError("experience")}
            </label>
            <label htmlFor="registration-teamName">Team / club <span>(optional)</span><input {...fieldProps("teamName")} autoComplete="organization" placeholder="Your crew" maxLength={100} />{fieldError("teamName")}</label>
            <label className="full" htmlFor="registration-notes">Anything we should know? <span>(optional)</span><textarea {...fieldProps("notes")} placeholder="Vehicle modifications, accessibility needs, or a question for the team…" maxLength={1200} rows={3} />{fieldError("notes")}</label>
            <label className="consent full" htmlFor="registration-consent">
              <input id="registration-consent" name="consent" type="checkbox" checked={values.consent} onChange={update} disabled={submitting || retryPending} required aria-invalid={Boolean(fieldErrors.consent)} aria-describedby={fieldErrors.consent ? "registration-consent-error" : undefined} />
              <span>I agree that bagspackgo may use these details to review my application and contact me about ROVX–Bhaderwah 26. I understand this application is subject to review and does not confirm a race entry. <a href="#privacy">Privacy notice</a>{fieldError("consent")}</span>
            </label>
          </div>
        )}
        <div className="honeypot" hidden aria-hidden="true"><label htmlFor="registration-website">Leave this field empty<input id="registration-website" name="website" type="text" value={values.website} onChange={update} tabIndex={-1} autoComplete="off" /></label></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          {step === 2 && <button type="button" className="back-button" onClick={() => changeStep(1)} disabled={submitting || retryPending}><ArrowLeft size={16} aria-hidden="true" /> Back</button>}
          <button type="submit" className="button button-red submit-button" disabled={submitting}>
            {submitting ? <><LoaderCircle className="spin" size={18} aria-hidden="true" /> Sending application…</> : step === 1 ? <>NEXT: YOUR MACHINE <ArrowRight size={18} aria-hidden="true" /></> : retryPending ? <>RETRY APPLICATION <Send size={17} aria-hidden="true" /></> : <>SEND APPLICATION <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </div>
        <p className="form-note"><LockKeyhole size={13} aria-hidden="true" /> {step === 1 ? "Your details go directly to the event team." : "Entry fee: ₹3,500 — collected only after organizer confirmation."}</p>
      </form>
    </div>
  );
}
