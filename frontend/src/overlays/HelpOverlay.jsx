import { useRef } from "react";
import { BookOpen, CheckCircle2, HelpCircle, Map, Newspaper, Search, TerminalSquare, X } from "lucide-react";
import { useDialogFocus } from "../hooks/useDialogFocus";

const quickStartItems = [
  "Start with the map. Each glowing node represents a nuclear plant or reactor site with operational, ownership, and market context.",
  "Click a plant to open its detail panel, then move between overview, ownership, finance, and decarbonization views.",
  "Use the top search box for plants, states, owners, ISOs, and tickers. The command palette is faster when you already know what you want.",
  "Switch to Markets, Outages, or Pipeline when you want equities, refueling timelines, or advanced reactor development in one focused view."
];

const viewGuide = [
  {
    icon: Map,
    title: "Map",
    copy: "Explore plant locations, generation, status, ISO regions, timeline shifts, and ownership links."
  },
  {
    icon: Newspaper,
    title: "News",
    copy: "Open the wire for nuclear industry headlines and jump from ticker chips into market context."
  },
  {
    icon: TerminalSquare,
    title: "Command",
    copy: "Press Ctrl+K to jump directly to views, plants, vendors, owners, states, ISOs, or tickers."
  },
  {
    icon: Search,
    title: "Research Flow",
    copy: "Search, inspect a plant, trace ownership, then compare the linked public companies in Markets."
  }
];

const qaItems = [
  {
    question: "What is this project?",
    answer: "Core Trace is a creator-built nuclear energy and financial markets dashboard. It is meant to make reactors, owners, outages, fuel economics, and public equities easier to explore together."
  },
  {
    question: "Why combine nuclear energy with markets?",
    answer: "Nuclear plants are infrastructure assets, grid resources, climate tools, and business exposures at the same time. Looking at energy data beside market data makes those relationships more visible."
  },
  {
    question: "Is this investment advice?",
    answer: "No. Treat it as an educational and exploratory tool. The financial views are helpful for learning and comparison, but they are not recommendations to buy, sell, or hold anything."
  },
  {
    question: "How do I inspect a plant?",
    answer: "Click a map node, then use the side panel tabs. Ownership shows parent companies and stakes, financial analytics models LCOE-style assumptions, and decarbonization estimates avoided emissions."
  },
  {
    question: "Why do some owners show as private or non-public?",
    answer: "Many nuclear assets are held by municipal utilities, cooperatives, public authorities, or private companies. When there is no public ticker, the app labels that relationship instead of inventing one."
  },
  {
    question: "Can I reopen this screen later?",
    answer: "Yes. Use the Help button in the top rail next to News whenever you want this read me, the control guide, or the Q&A again."
  }
];

export default function HelpOverlay({ onClose }) {
  const modalRef = useRef(null);
  useDialogFocus(modalRef, onClose, { initialFocus: ".help-primary-btn" });

  return (
    <div className="help-backdrop" onClick={onClose}>
      <section
        ref={modalRef}
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="help-header">
          <div className="help-title-group">
            <span className="help-kicker">
              <BookOpen size={15} aria-hidden="true" />
              READ ME
            </span>
            <h2 id="help-title">Welcome to Core Trace</h2>
          </div>
          <button className="overlay-icon-btn" type="button" onClick={onClose} aria-label="Close help">
            <X size={16} />
          </button>
        </header>

        <div className="help-content">
          <section className="help-intro" aria-label="Creator project introduction">
            <p>
              Hi there, welcome to my creator project. I built Core Trace because I have always been fascinated by the
              intersection of nuclear energy and financial markets. This dashboard turns that curiosity into an
              interactive workspace for exploring how reactors, utilities, outages, fuel costs, ownership, and public
              companies connect.
            </p>
            <p>
              Think of it as a nuclear market terminal: start with the grid, click into the assets, follow the ownership
              trail, and use the market views when you want to understand the business context behind the energy system.
            </p>
          </section>

          <section className="help-section" aria-labelledby="quick-start-title">
            <div className="help-section-heading">
              <CheckCircle2 size={16} aria-hidden="true" />
              <h3 id="quick-start-title">Quick Start</h3>
            </div>
            <ol className="help-steps">
              {quickStartItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="help-section" aria-labelledby="views-title">
            <div className="help-section-heading">
              <HelpCircle size={16} aria-hidden="true" />
              <h3 id="views-title">What The Main Tools Do</h3>
            </div>
            <div className="help-tool-grid">
              {viewGuide.map(({ icon: Icon, title, copy }) => (
                <article className="help-tool" key={title}>
                  <Icon size={17} aria-hidden="true" />
                  <div>
                    <h4>{title}</h4>
                    <p>{copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="help-section" aria-labelledby="qa-title">
            <div className="help-section-heading">
              <HelpCircle size={16} aria-hidden="true" />
              <h3 id="qa-title">Q&A</h3>
            </div>
            <dl className="help-qa-list">
              {qaItems.map((item) => (
                <div className="help-qa-item" key={item.question}>
                  <dt>{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <footer className="help-footer">
          <button className="help-primary-btn" type="button" onClick={onClose}>
            <CheckCircle2 size={15} aria-hidden="true" />
            Start Exploring
          </button>
        </footer>
      </section>
    </div>
  );
}
