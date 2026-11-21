export function renderFooterSectionHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-final" id="scene-final" data-scene-index="6">
      <div class="mos-container mos-final-inner" data-mos-reveal>
        <img
          src="./assets/marketos-wordmark.png"
          alt="MarketOS — Plan. Create. Grow."
          class="mos-final-wordmark"
          width="280"
          height="66"
        />
        <span class="mos-kicker">THE AI BUSINESS OPERATING SYSTEM</span>
        <h2 class="mos-final-title">Plan. Create. Grow.</h2>
        <p class="mos-lead mos-final-lead">
          Your next stage of growth starts with MarketOS.
        </p>

        <div class="mos-hero-ctas">
          <button type="button" id="mos-final-start" class="mos-btn mos-btn-primary">
            ${isAuthenticated ? "Return to Dashboard" : "Start Building"}
          </button>
          <button type="button" id="mos-final-cyton" class="mos-btn mos-btn-outline">
            ${isAuthenticated ? "Open CYTON" : "Sign In"}
          </button>
        </div>
      </div>
    </section>

    <footer class="mos-footer">
      <div class="mos-container mos-footer-grid" data-mos-reveal data-mos-reveal-delay="0.08">
        <div class="mos-footer-brand">
          <img
            src="./assets/marketos-wordmark.png"
            alt="MarketOS"
            class="mos-footer-wordmark"
            width="160"
            height="38"
          />
          <p class="mos-footer-copy">
            MarketOS is the AI Business Operating System for creators, growing businesses, agencies, and modern operators.
          </p>
        </div>

        <div class="mos-footer-col">
          <h4>Platform</h4>
          <a href="#scene-intro" data-mos-scroll="scene-intro">Overview</a>
          <a href="#scene-command" data-mos-scroll="scene-command">Command Center</a>
          <a href="#scene-cyton" data-mos-scroll="scene-cyton">CYTON Assistant</a>
          <a href="#scene-automation" data-mos-scroll="scene-automation">Automation Workflow</a>
          <a href="#scene-analytics" data-mos-scroll="scene-analytics">Analytics</a>
          <a href="#scene-pricing" data-mos-scroll="scene-pricing">Pricing</a>
        </div>

        <div class="mos-footer-col">
          <h4>Legal &amp; Governance</h4>
          <a href="/privacy" id="mos-legal-privacy" data-legal-doc="privacy">Privacy Policy</a>
          <a href="/terms" id="mos-legal-terms" data-legal-doc="terms">Terms and Conditions</a>
          <a href="#security" id="mos-legal-security" data-legal-doc="security">OAuth &amp; Security Policy</a>
        </div>

        <div class="mos-footer-col">
          <h4>Contact &amp; Access</h4>
          <a href="mailto:marketosagency@gmail.com">marketosagency@gmail.com</a>
          <a href="/login" id="mos-footer-signin">${isAuthenticated ? "Workspace Dashboard" : "Account Sign In"}</a>
          <a href="/signup" id="mos-footer-signup">${isAuthenticated ? "CYTON Command Centre" : "Create Account"}</a>
        </div>
      </div>

      <div class="mos-container mos-footer-bottom">
        <span>MarketOS &bull; Plan. Create. Grow.</span>
        <span>marketosai.vercel.app</span>
      </div>
    </footer>
  `;
}

const LEGAL_DOCS = {
  privacy: {
    title: "MarketOS Privacy Policy",
    updated: "Effective November 2026",
    sections: [
      {
        h: "1. Data Collected & Purpose",
        p: "MarketOS stores the business profile, brand guidelines, campaign plans, content drafts, analytics entries, and CYTON conversation history you actively create inside your workspace. Authentication utilizes Firebase Authentication and optional local browser workspaces."
      },
      {
        h: "2. External Integrations & Credentials",
        p: "MarketOS strictly uses official OAuth integrations when configured and never collects or stores third-party social media account passwords."
      },
      {
        h: "3. AI Processing & User Keys",
        p: "When using BYOK AI keys saved in your browser settings or configured server providers via /api/cyton/orchestrate, prompts and optional attachments are transmitted solely to fulfill your requested workspace task."
      },
      {
        h: "4. Contact",
        p: "For privacy requests, workspace deletion, or compliance questions, contact marketosagency@gmail.com."
      }
    ]
  },
  terms: {
    title: "MarketOS Terms and Conditions",
    updated: "Effective November 2026",
    sections: [
      {
        h: "1. Platform Scope",
        p: "MarketOS provides campaign planning, AI-assisted content drafting, SEO website inspection, analytics tracking, and the CYTON Command Centre as a business productivity operating system."
      },
      {
        h: "2. Owner Approval & Account Responsibility",
        p: "Sensitive external operations (such as publishing social posts or dispatching outbound emails) remain gated behind explicit user review and approval. You retain sole responsibility for reviewing generated drafts before publishing."
      },
      {
        h: "3. Subscription Tiers & Billing Preview",
        p: "Starter, Growth, and Business plan limits apply per active workspace tier. Where payment checkout runs in preview mode, plan changes update workspace tier previews without unauthorized charges."
      }
    ]
  },
  security: {
    title: "OAuth, Security & Approval Governance",
    updated: "Platform Architecture Standard",
    sections: [
      {
        h: "SSRF-Protected Live URL Analysis",
        p: "Server-side SEO and competitor research validates public HTTP/HTTPS targets and rejects private network IP ranges and localhost endpoints."
      },
      {
        h: "Honest Execution & Audit Logging",
        p: "Action classes (PUBLISH, SEND, DELETE) enforce server-side explicit approval flags before execution and record results honestly inside CYTON activity logs."
      }
    ]
  }
};

export function openLegalDocumentModal(docKey = "privacy") {
  const doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.privacy;
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="mos-legal-backdrop" role="dialog" aria-modal="true" aria-labelledby="mos-legal-title">
      <div class="modal-card mos-legal-modal">
        <div class="row-between">
          <div>
            <span class="mos-kicker" style="margin-bottom:0.25rem;">${doc.updated}</span>
            <h3 id="mos-legal-title" style="margin:0;">${doc.title}</h3>
          </div>
          <button type="button" id="mos-legal-close" class="btn btn-outline btn-sm" aria-label="Close document">Close</button>
        </div>
        <div class="mos-legal-scroll">
          ${doc.sections
            .map(
              (s) => `
              <div class="mos-legal-block">
                <h4>${s.h}</h4>
                <p>${s.p}</p>
              </div>`
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
  const close = () => {
    modalRoot.innerHTML = "";
  };
  document.getElementById("mos-legal-close")?.addEventListener("click", close);
  document.getElementById("mos-legal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "mos-legal-backdrop") close();
  });
}

export function bindFooterEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard, scrollToSection }) {
  root.querySelectorAll("footer [data-mos-scroll]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection(el.getAttribute("data-mos-scroll"));
    });
  });

  document.getElementById("mos-final-start")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("overview");
    else onOpenAuth("signup");
  });
  document.getElementById("mos-final-cyton")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("cyton");
    else onOpenAuth("signin");
  });
  document.getElementById("mos-footer-signin")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (isAuthenticated) onOpenDashboard("overview");
    else onOpenAuth("signin");
  });
  document.getElementById("mos-footer-signup")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (isAuthenticated) onOpenDashboard("cyton");
    else onOpenAuth("signup");
  });
  root.querySelectorAll("[data-legal-doc]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openLegalDocumentModal(el.getAttribute("data-legal-doc"));
    });
  });
}
