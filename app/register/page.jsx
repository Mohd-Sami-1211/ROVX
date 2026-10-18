"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowLeft, Check, X, Menu, Mountain } from "lucide-react";
import RegistrationForm from "../../components/registration-form";
import "../globals.css";

function RovxLogo() {
  return (
    <a href="/" className="rovx-logo" aria-label="ROVX — home">
      <img src="/media/rovx-logo.png" alt="ROVX" width="158" height="48" />
    </a>
  );
}

function Bagspackgo() {
  return (
    <a className="bpg-logo" href="https://www.bagspackgo.com" target="_blank" rel="noreferrer" aria-label="Visit bagspackgo">
      <img src="/media/bagspackgo-logo.svg" alt="bagspackgo" width="150" height="40" />
    </a>
  );
}

export default function RegisterPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="site-atmosphere" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="site-header">
        <div className="header-inner">
          <RovxLogo />
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="/">Home</a>
            <a href="/#event">The race</a>
            <a href="/#experience">Experience</a>
            <a href="/#partners">Partners</a>
            <a href="/#faqs">FAQs</a>
          </nav>
          <a className="button glass-button header-cta" href="/">
            <ArrowLeft size={15} /> Back to site
          </a>
          <button
            className="menu-button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation" hidden={!mobileOpen}>
          <a href="/" onClick={() => setMobileOpen(false)}>Home <ArrowUpRight size={16} /></a>
          <a href="/#event" onClick={() => setMobileOpen(false)}>The race <ArrowUpRight size={16} /></a>
          <a href="/#experience" onClick={() => setMobileOpen(false)}>Experience <ArrowUpRight size={16} /></a>
          <a href="/#partners" onClick={() => setMobileOpen(false)}>Partners <ArrowUpRight size={16} /></a>
          <a href="/#faqs" onClick={() => setMobileOpen(false)}>FAQs <ArrowUpRight size={16} /></a>
        </nav>
      </header>

      {/* ── Registration grid ── */}
      <main id="main">
        <section className="register-section section">
          <div className="registration-grid container">
            <div className="registration-story reveal">
              <div className="reg-page-label">
                <span className="red-dot" />
                <span>ROVX / BHADERWAH / 2026</span>
              </div>
              <h2>Don't just<br />watch the <em>wild.</em><br />Be part of it.</h2>
              <p>You bring the machine.<br />We'll bring the moment.</p>
              <div className="registration-points">
                <span><Check size={15} /> 13 December 2026 · Bhaderwah</span>
                <span><Check size={15} /> Two complimentary nights of stay</span>
                <span><Check size={15} /> Driver &amp; vehicle review by the organizers</span>
              </div>
              <div className="entry-note">
                <span className="micro-label">ENTRY FEE</span>
                <strong>₹3,500</strong>
                <p>Fee collected only after organizer confirmation. No payment is taken through this form.</p>
              </div>
              <div className="reg-page-back">
                <a href="/" className="underlined-link">
                  <ArrowLeft size={16} /> Return to main site
                </a>
              </div>
            </div>
            <RegistrationForm />
          </div>
        </section>
      </main>

      {/* ── Minimal footer ── */}
      <footer className="reg-page-footer">
        <div className="container">
          <div className="reg-footer-inner">
            <RovxLogo />
            <span className="footer-bda">
              Presented by <Bagspackgo /> in collaboration with <strong>Bhaderwah Development Authority</strong>
            </span>
            <span className="micro-label">© 2026 ROVX. A bagspackgo event.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
