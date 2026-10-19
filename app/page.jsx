"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDown, ChevronDown, Plus, X, Menu, CalendarDays, MapPin, Flag, Trophy, Mountain } from "lucide-react";

const PASSES = "https://www.bagspackgo.com/user/events";
const questions = [
  ["When and where is the first edition?", "ROVX–Bhaderwah 26 takes place on 13 December 2026 in Bhaderwah, Jammu & Kashmir. The exact venue, reporting time, and detailed schedule will be announced here."],
  ["Who can apply to race?", "Drivers can submit their contact and vehicle details below. The organizing team will review applications. Vehicle classes, eligibility requirements, and the technical rulebook will be announced before entries are confirmed."],
  ["What is the race format and prize pool?", "The race format and prize pool are to be announced. We'll publish the confirmed details here. ROVX is an offroad motorsport event for cars."],
  ["Does applying confirm my race entry?", "Your application is the first step. You'll receive a reference on screen once it has been saved. The organizers will review your details and contact you with the next steps. No payment is collected in this form; the registration fee is to be announced."],
  ["Where do I get audience passes?", "Audience passes are handled by bagspackgo. Follow Get audience passes to its events page to check availability."]
];
function Bagspackgo({ className = "" }) {
  return <a className={"bpg-logo "+className} href="https://www.bagspackgo.com" target="_blank" rel="noreferrer" aria-label="Visit bagspackgo"><img src="/media/bagspackgo-logo.svg" alt="bagspackgo" width="150" height="40" /></a>;
}
function RovxLogo() {
  return <a href="#home" className="rovx-logo" aria-label="ROVX — home"><img src="/media/rovx-logo.png" alt="ROVX" width="158" height="48" /></a>;
}
function SectionLabel({children, number}) {
  return <div className="section-label"><span className="red-dot" />{children}<span className="section-number">/ {number}</span></div>;
}
function EditorialImage({src,alt,className=""}) {
  const [loaded,setLoaded]=useState(false);
  return <div className={"editorial-image "+className+" "+(loaded?"loaded":"loading-image")}><img src={src} alt={alt} loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} onError={()=>setLoaded(true)}/></div>;
}
function EventCountdown(){
  const [days,setDays]=useState(null);
  useEffect(()=>{const tick=()=>setDays(Math.max(0,Math.ceil((new Date("2026-12-13T00:00:00+05:30").getTime()-Date.now())/86400000)));tick();const id=setInterval(tick,60000);return()=>clearInterval(id)},[]);
  return <span className="countdown"><span className="red-dot"/>{days===null?"THE COUNTDOWN IS ON":days>0?days+" DAYS TO THE FIRST FLAG":"13 DECEMBER 2026 · FIRST EDITION"}</span>
}
export default function Home(){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [activeFaq,setActiveFaq]=useState(null);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}
    }),{threshold:.1});
    document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
    return()=>{observer.disconnect()}
  },[]);
  useEffect(()=>{document.body.style.overflow=mobileOpen?"hidden":"";return()=>{document.body.style.overflow=""}},[mobileOpen]);
  return <>
  <a href="#main" className="skip-link">Skip to content</a>
  <div className="site-atmosphere" aria-hidden="true"/>
  <header className="site-header"><div className="header-inner">
    <RovxLogo/>
    <nav className="desktop-nav" aria-label="Main navigation"><a className="nav-home" href="#home">Home</a><a href="#event">The race</a><a href="#experience">Experience</a><a href="#partners">Partners</a><a href="#faqs">FAQs</a></nav>
    <a className="button red-button header-cta" href="/register#participant-registration">Join the grid <ArrowUpRight size={15}/></a>
    <button className="menu-button" aria-expanded={mobileOpen} aria-controls="mobile-nav" aria-label={mobileOpen?"Close navigation":"Open navigation"} onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen?<X/>:<Menu/>}</button>
  </div>
  {mobileOpen&&<nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation" onKeyDown={event=>{if(event.key==="Escape")setMobileOpen(false)}}>{[["Home","#home"],["The race","#event"],["Experience","#experience"],["Partners","#partners"],["FAQs","#faqs"]].map(([label,href])=><a href={href} key={href} onClick={()=>setMobileOpen(false)}>{label}<ArrowUpRight size={20}/></a>)}<a href="/register#participant-registration" onClick={()=>setMobileOpen(false)}>Join the grid<ArrowUpRight size={20}/></a></nav>}
  </header>
  <main id="main">
    <section className="hero" id="home" aria-labelledby="hero-heading">
      <img className="hero-art" src="/media/jeep-eclipse-v2.webp" alt="A modified black offroad jeep with oversized tires, illuminated by a crimson eclipse" fetchPriority="high" width="1672" height="941"/>
      <div className="hero-vignette"/>
      <div className="hero-grid" aria-hidden="true"/>
      <div className="hero-content container">
        <p className="hero-event"><span>ROVX-Bhaderwah</span><span className="hero-event-year">26</span></p>
        <h1 id="hero-heading">Born for<br/><em>the wild.</em></h1>
        <p className="hero-description">The mountains don't do ordinary.<br/>Neither do we. Welcome to the untamed.</p>
        <div className="hero-actions"><a className="button red-button" href="/register#participant-registration">Register to race <ArrowUpRight size={17}/></a><a className="button glass-button" href={PASSES} target="_blank" rel="noreferrer">Get audience passes <ArrowUpRight size={16}/></a></div>
        <div className="presenter-lockup"><div className="presenter-brand"><span>PRESENTED BY</span><Bagspackgo/></div><span className="collaboration-cross">×</span><div className="bda-lockup"><span>IN COLLABORATION WITH</span><strong>BDA</strong><small>Bhaderwah Development Authority</small></div></div>
      </div>
      <div className="hero-bottom container"><EventCountdown/><a href="#event" className="scroll-link">ENTER THE UNTAMED <ArrowDown size={15}/></a></div>
    </section>

    <div className="event-bar container reveal">
      <div><CalendarDays size={18}/><span>THE DATE<strong>13 December '26</strong></span></div>
      <div><MapPin size={18}/><span>THE DESTINATION<strong>Bhaderwah, J&K</strong></span></div>
      <div><Flag size={18}/><span>THE OCCASION<strong>Edition 001</strong></span></div>
    </div>

    <section id="event" className="event-section section container">
      <div className="event-story reveal"><SectionLabel number="01">A DIFFERENT BREED</SectionLabel><h2>Leave ordinary<br/>in the <em>dust.</em></h2><p className="lead">Some roads are worth leaving.</p><p>ROVX brings its first-ever edition to Bhaderwah. An offroad motorsport race for cars, set against the raw beauty of the mountains.</p><p>For those who build their machines with purpose. Who choose the harder line. Who feel most alive beyond the asphalt.</p><a href="/register#participant-registration" className="underlined-link">Your next story starts here <ArrowUpRight size={16}/></a></div>
      <div className="event-visual reveal"><EditorialImage src="/media/rally-campaign-v2.webp" alt="A modified black rally coupe driving through crimson-lit mountain gravel"/><span className="corner-cross top-left">+</span><span className="corner-cross bottom-right">+</span><div className="image-caption"><span>ROVX / THE OFFROAD SPIRIT</span><span>01 — 26</span></div><div className="image-tag"><span className="red-dot"/> MADE FOR THE ONES WHO DARE.</div></div>
      <div className="race-details reveal">
        <div className="detail-item"><span className="detail-index">01</span><div><h3>The playground</h3><strong>Bhaderwah</strong><p>Exact venue &amp; course to be announced.</p></div><MapPin size={19}/></div>
        <div className="detail-item"><span className="detail-index">02</span><div><h3>The challenge</h3><strong>Format coming soon</strong><p>Race classes &amp; rulebook to follow.</p></div><Flag size={19}/></div>
        <div className="detail-item"><span className="detail-index">03</span><div><h3>The stakes</h3><strong>Prize pool to be announced</strong><p>Something to race for. Details soon.</p></div><Trophy size={19}/></div>
      </div>
    </section>

    <div className="manifesto-band" aria-label="No ordinary roads. No ordinary stories.">
      <div aria-hidden="true">
        <span>NO ORDINARY ROADS.</span><i>✳</i><span className="outline">NO ORDINARY STORIES.</span><i>✳</i><span>ROVX '26.</span><i>✳</i>
        <span>NO ORDINARY ROADS.</span><i>✳</i><span className="outline">NO ORDINARY STORIES.</span><i>✳</i><span>ROVX '26.</span><i>✳</i>
      </div>
    </div>

    <section id="experience" className="experience-section section container">
      <div className="section-heading reveal"><div><SectionLabel number="02">THIS IS WHAT YOU CAME FOR</SectionLabel><h2>More than<br/><em>a race.</em></h2></div><p>The machines. The mountains. The feeling.<br/>Some things you have to be there for.</p></div>
      <div className="experience-cards">
        <article className="experience-card reveal"><EditorialImage src="/media/card-energy.jpg" alt="A lineup of modified offroad trucks on a gravel plain" className="jeep-card-image"/><div className="card-shade"/><div className="card-topline"><span>01 / THE MACHINES</span><ArrowUpRight size={18}/></div><div className="card-copy"><h3>Built different.</h3><p>Passion in every modification.<br/>Purpose in every turn.</p></div><div className="card-bracket"/></article>
        <article className="experience-card center-card reveal"><EditorialImage src="/media/card-adrenaline.jpg" alt="Mitsubishi offroader ploughing through deep mud" className="rally-card-image"/><div className="card-shade"/><div className="card-topline"><span>02 / THE ADRENALINE</span><ArrowUpRight size={18}/></div><div className="card-copy"><h3>Feel everything.</h3><p>Every rev. Every heartbeat.<br/>Every moment that stays.</p></div><div className="card-bracket"/></article>
        <article className="experience-card reveal"><EditorialImage src="/media/card-machines.jpg" alt="Offroad jeep conquering a mud hill with a crowd watching"/><div className="card-shade"/><div className="card-topline"><span>03 / THE ENERGY</span><ArrowUpRight size={18}/></div><div className="card-copy"><h3>All in. All alive.</h3><p>For the drivers. For the crowd.<br/>For the love of the dirt.</p></div><div className="card-bracket"/></article>
      </div>
      <p className="visual-note">A visual expression of the ROVX spirit. The confirmed venue and course will be announced.</p>
    </section>

    <section id="partners" className="partners-section section container">
      <div className="section-heading reveal"><div><SectionLabel number="03">THE PEOPLE BEHIND THE ROAR</SectionLabel><h2>One vision.<br/><em>More horsepower.</em></h2></div><p>Adventure meets a sense of place.<br/>Together, we're starting something new.</p></div>
      <div className="partner-stage reveal"><div className="partner-block"><span className="micro-label">PRESENTED BY</span><Bagspackgo className="partner-logo"/><p>The parent company behind ROVX.</p></div><span className="partner-cross">×</span><div className="partner-block"><span className="micro-label">IN COLLABORATION WITH</span><div className="bda-partner"><Mountain size={40} strokeWidth={1}/><div><strong>BDA</strong><span>Bhaderwah Development Authority</span></div></div><p>Bringing Bhaderwah to the starting line.</p></div></div>
      <div className="sponsor-announcement reveal"><span className="micro-label">OUR SPONSORS</span><div><span className="red-dot"/><p>The lineup is coming together.</p></div><span className="coming-label">ANNOUNCING SOON <ArrowUpRight size={13}/></span></div>
    </section>

    <section className="audience-section reveal">
      <video className="section-video-bg" src="/media/audience-bg.mp4" autoPlay muted loop playsInline aria-hidden="true"/>
      <div className="section-video-overlay" aria-hidden="true"/>
      <div className="audience-inner container">
        <div className="audience-symbol" aria-hidden="true">✳</div>
        <div><span className="micro-label">THE OTHER SIDE OF THE STARTING LINE</span><h2>Come for the cars.<br/><em>Bring the noise.</em></h2><p>Not racing? There's a place for you in the crowd.</p></div>
        <a className="button red-button" href={PASSES} target="_blank" rel="noreferrer">Get audience passes <ArrowUpRight size={18}/></a>
      </div>
    </section>

    <section id="faqs" className="faq-section section container"><div className="faq-intro reveal"><SectionLabel number="05">BEFORE THE FIRST REV</SectionLabel><h2>A little<br/><em>clarity.</em></h2><p>Everything to know before you go.</p></div><div className="faq-list reveal">{questions.map(([q,a],i)=><div className={"faq-item "+(activeFaq===i?"open":"")} key={q}><h3><button id={"faq-button-"+i} aria-expanded={activeFaq===i} aria-controls={"faq-answer-"+i} onClick={()=>setActiveFaq(activeFaq===i?null:i)}><span className="faq-number">0{i+1}</span>{q}<Plus size={17}/></button></h3><div id={"faq-answer-"+i} role="region" aria-labelledby={"faq-button-"+i} hidden={activeFaq!==i}><p>{a}</p></div></div>)}</div></section>

    <footer className="footer">
      <video className="section-video-bg" src="/media/footer-bg.mp4" autoPlay muted loop playsInline aria-hidden="true"/>
      <div className="section-video-overlay" aria-hidden="true"/>
      <div className="container"><div className="footer-head"><div><span className="micro-label">13 DECEMBER 2026. BHADERWAH.</span><h2>See you in <em>the dirt.</em></h2></div><a href="/register#participant-registration" className="footer-round-link" aria-label="Register for ROVX"><ArrowUpRight size={32}/></a></div><div className="footer-brands"><RovxLogo/><div><span className="micro-label">AN EVENT BY</span><Bagspackgo/></div><span className="footer-bda">In collaboration with<br/><strong>Bhaderwah Development Authority</strong></span></div><details id="privacy" className="privacy-notice"><summary>Participant privacy notice <ChevronDown size={13}/></summary><p>The ROVX organizing team uses the contact, driver, and vehicle details you submit to review your application and coordinate participation. Applications are stored in the event database. Do not include identity documents, financial information, or sensitive personal information in the notes. No payment is collected here. To ask about your application or personal data, contact bagspackgo through its official website and include your application reference.</p></details><div className="footer-bottom"><span>© 2026 ROVX. A bagspackgo event.</span><span>FIRST EDITION. LASTING IMPRESSIONS.</span><a href="#home">BACK TO TOP <ArrowUpRight size={12}/></a></div></div>
    </footer>
  </main>
  </>;
}
