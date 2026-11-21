const CAPABILITY_FILTERS = [
  "All Capabilities",
  "Content & Strategy",
  "Visual & Brand",
  "Research & Intelligence",
  "Automation & Code"
];

const AI_CAPABILITY_DOMAINS = [
  {
    id: "campaign_intelligence",
    category: "Content & Strategy",
    kicker: "STRATEGIC GENERATION",
    title: "Campaign & Copy Intelligence",
    badge: "Text & Planning",
    description:
      "Transform business goals into structured launch roadmaps, multi-channel campaign sequences, and brand-consistent messaging.",
    deliverables: ["Launch Roadmaps", "Multi-Channel Copy", "Audience Angles"],
    glyph: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="15" stroke="#A855F7" stroke-width="1.4" stroke-dasharray="3 3"/><polygon points="20,8 29,26 11,26" stroke="#F5F5F7" stroke-width="1.5" fill="rgba(124,58,237,0.18)"/><circle cx="20" cy="20" r="2.5" fill="#A855F7"/></svg>`
  },
  {
    id: "visual_brand",
    category: "Visual & Brand",
    kicker: "CREATIVE DIRECTION",
    title: "Visual & Brand Architecture",
    badge: "Multimodal Creative",
    description:
      "Build cohesive creative briefs, visual direction concepts, ad variations, and brand voice guardrails inside one creative suite.",
    deliverables: ["Creative Briefs", "Ad Concepts", "Brand Guidelines"],
    glyph: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="3" stroke="#F5F5F7" stroke-width="1.4"/><rect x="18" y="18" width="14" height="14" rx="3" stroke="#A855F7" stroke-width="1.4" fill="rgba(168,85,247,0.16)"/><circle cx="25" cy="25" r="2.2" fill="#F5F5F7"/></svg>`
  },
  {
    id: "market_research",
    category: "Research & Intelligence",
    kicker: "LIVE INSIGHTS",
    title: "Web & SEO Intelligence",
    badge: "Real-Time Analysis",
    description:
      "Analyze live public landing pages, heading hierarchies, and metadata signals to guide positioning and content opportunities.",
    deliverables: ["Metadata Audits", "Keyword Strategy", "Blog Outlines"],
    glyph: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="13" stroke="#A855F7" stroke-width="1.4"/><ellipse cx="20" cy="20" rx="6" ry="13" stroke="#F5F5F7" stroke-width="1.2"/><line x1="7" y1="20" x2="33" y2="20" stroke="#A855F7" stroke-width="1.2"/></svg>`
  },
  {
    id: "social_video",
    category: "Content & Strategy",
    kicker: "AUDIENCE CHANNELS",
    title: "Social & Storyboard Studio",
    badge: "Video & Social",
    description:
      "Generate platform-tailored social posts, short-form video scripts, storyboards, and timezone-aware publishing calendars.",
    deliverables: ["Video Scripts", "Post Sequences", "Content Calendar"],
    glyph: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><rect x="7" y="10" width="26" height="20" rx="5" stroke="#A855F7" stroke-width="1.4"/><polygon points="17,15 26,20 17,25" fill="#F5F5F7"/></svg>`
  },
  {
    id: "workflow_automation",
    category: "Automation & Code",
    kicker: "EXECUTION PIPELINES",
    title: "Workflow & Code Automation",
    badge: "Structured Logic",
    description:
      "Convert natural-language directives into repeatable execution plans, structured technical briefs, and approval-gated workflows.",
    deliverables: ["Task Pipelines", "Structured Specs", "Approval Routing"],
    glyph: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><circle cx="11" cy="12" r="3.2" stroke="#F5F5F7" stroke-width="1.4"/><circle cx="29" cy="12" r="3.2" stroke="#A855F7" stroke-width="1.4"/><circle cx="20" cy="29" r="3.2" stroke="#A855F7" stroke-width="1.4" fill="rgba(168,85,247,0.25)"/><path d="M14 13.5L26 13.5M12.5 15L18.5 26M27.5 15L21.5 26" stroke="#9696A5" stroke-width="1.3"/></svg>`
  },
  {
    id: "growth_analytics",
    category: "Research & Intelligence",
    kicker: "PERFORMANCE CLARITY",
    title: "Growth & Metric Synthesis",
    badge: "Decision Ready",
    description:
      "Distill verified campaign outcomes into clear executive summaries while keeping real observed data separated from estimates.",
    deliverables: ["Executive Briefs", "Channel Reviews", "Action Next Steps"],
    glyph: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><path d="M9 28L16 21L22 24L31 12" stroke="#A855F7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="31" cy="12" r="2.6" fill="#F5F5F7"/><line x1="8" y1="31" x2="32" y2="31" stroke="#9696A5" stroke-width="1.2"/></svg>`
  }
];

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMarketplaceShowcaseHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-marketplace" id="scene-marketplace" data-scene-index="1">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">01 &bull; AI DISCOVERY</span>
          <h2>Discover powerful AI capabilities.<br /><span class="mos-accent-span">One destination for every workflow.</span></h2>
          <p class="mos-lead">
            Explore specialized AI capabilities—from strategic planning and visual direction to live web intelligence and workflow automation—inside one unified marketplace.
          </p>
        </div>

        <div class="mos-filter-row" id="mos-provider-filters" role="tablist" aria-label="Filter AI capabilities" data-mos-reveal data-mos-reveal-delay="0.06">
          ${CAPABILITY_FILTERS.map(
            (f, idx) => `
              <button
                type="button"
                role="tab"
                aria-selected="${idx === 0}"
                class="mos-filter-pill ${idx === 0 ? "active" : ""}"
                data-capability-filter="${esc(f)}"
              >
                ${esc(f)}
              </button>`
          ).join("")}
        </div>

        <div class="mos-model-grid" id="mos-model-grid" data-mos-reveal data-mos-reveal-delay="0.12">
          ${renderCapabilityCardsHtml(AI_CAPABILITY_DOMAINS, isAuthenticated)}
        </div>
      </div>
    </section>
  `;
}

function renderCapabilityCardsHtml(items, isAuthenticated) {
  return items
    .map(
      (item) => `
        <article class="mos-glass-card mos-model-card" data-capability-id="${esc(item.id)}" data-depth-card>
          <div class="mos-model-card-top">
            <div class="mos-cap-head-row">
              <div class="mos-cap-glyph">${item.glyph}</div>
              <div>
                <span class="mos-data-label">${esc(item.kicker)}</span>
                <h3>${esc(item.title)}</h3>
              </div>
            </div>
            <span class="mos-pill-tag">${esc(item.badge)}</span>
          </div>

          <p class="mos-data-copy">${esc(item.description)}</p>

          <div class="mos-model-chips">
            ${item.deliverables.map((d) => `<span class="mos-model-id">${esc(d)}</span>`).join("")}
          </div>

          <div class="mos-model-card-foot">
            <button type="button" class="mos-btn mos-btn-outline mos-btn-sm" data-launch-capability="${esc(item.id)}">
              ${isAuthenticated ? "Open in Workspace" : "Access Capability"}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

export function bindMarketplaceShowcaseEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard }) {
  let activeFilter = CAPABILITY_FILTERS[0];
  const gridEl = document.getElementById("mos-model-grid");

  const bindLaunchButtons = () => {
    gridEl?.querySelectorAll("[data-launch-capability]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isAuthenticated) onOpenDashboard("cyton");
        else onOpenAuth("signup");
      });
    });
  };

  const redraw = () => {
    if (!gridEl) return;
    const filtered =
      activeFilter === "All Capabilities"
        ? AI_CAPABILITY_DOMAINS
        : AI_CAPABILITY_DOMAINS.filter((item) => item.category === activeFilter);
    gridEl.innerHTML = renderCapabilityCardsHtml(filtered, isAuthenticated);
    bindLaunchButtons();
  };

  root.querySelectorAll("[data-capability-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.getAttribute("data-capability-filter") || CAPABILITY_FILTERS[0];
      root.querySelectorAll("[data-capability-filter]").forEach((b) => {
        const isOn = b.getAttribute("data-capability-filter") === activeFilter;
        b.classList.toggle("active", isOn);
        b.setAttribute("aria-selected", String(isOn));
      });
      redraw();
    });
  });

  bindLaunchButtons();

  return { cleanup: () => {} };
}
