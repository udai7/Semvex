// Semvex SPA — auth flow + search comparison UI
(() => {
  const html = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const state = { authMode: "signin", preauth: null, searchMode: "compare", lastQuery: "" };

  const setView = (v) => { html.setAttribute("data-view", v); window.scrollTo(0, 0); };

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      ...opts,
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  }

  // ---------- Session bootstrap ----------
  async function refreshSession() {
    const { data } = await api("/auth/me");
    const chip = $("#userChip");
    if (data.authenticated) {
      chip.textContent = data.email;
      chip.classList.remove("hidden");
      $("#navSignIn").classList.add("hidden");
      $("#navSignOut").classList.remove("hidden");
      return data.email;
    }
    chip.classList.add("hidden");
    $("#navSignIn").classList.remove("hidden");
    $("#navSignOut").classList.add("hidden");
    return null;
  }

  // ---------- Navigation ----------
  document.querySelectorAll("[data-nav]").forEach((el) =>
    el.addEventListener("click", async () => {
      const target = el.getAttribute("data-nav");
      if (target === "auth") {
        const email = await refreshSession();
        setView(email ? "app" : "auth");
      } else setView(target);
    })
  );

  $("#navSignOut").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    await refreshSession();
    setView("landing");
  });

  // ---------- Auth tabs ----------
  document.querySelectorAll(".auth-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      state.authMode = tab.getAttribute("data-mode");
      $("#authSubmit").textContent = state.authMode === "signup" ? "Create account" : "Sign in";
      $("#signupHint").hidden = state.authMode !== "signup";
      $("#authError").textContent = "";
    })
  );

  // ---------- Google ----------
  (async () => {
    const { data } = await api("/config");
    if (!data.google_enabled) {
      $("#googleBtn").addEventListener("click", () => {
        $("#authError").textContent =
          "Google sign-in isn’t configured on this server — set GOOGLE_CLIENT_ID / SECRET to enable it. Use email + password below.";
      });
    } else {
      $("#googleBtn").addEventListener("click", () => { window.location.href = "/auth/google/start"; });
    }
  })();

  // ---------- Email / password ----------
  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#authError").textContent = "";
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const path = state.authMode === "signup" ? "/auth/signup" : "/auth/login";
    const { ok, data } = await api(path, { method: "POST", body: JSON.stringify({ email, password }) });
    if (!ok) { $("#authError").textContent = data.error || "Something went wrong."; return; }

    state.preauth = data.preauth;
    if (data.next === "totp_setup") { setView("totp-setup"); loadTotpSetup(); }
    else if (data.next === "totp") { setView("totp-verify"); $("#verifyCode").focus(); }
  });

  // ---------- 2FA setup ----------
  async function loadTotpSetup() {
    $("#qrBox").textContent = "Loading…";
    $("#setupError").textContent = "";
    $("#setupCode").value = "";
    const { ok, data } = await api("/auth/totp/provision", {
      method: "POST", body: JSON.stringify({ preauth: state.preauth }),
    });
    if (!ok) { $("#setupError").textContent = data.error || "Could not start 2FA setup."; return; }
    $("#qrBox").innerHTML = data.qr_svg;
    $("#secretText").textContent = data.secret;
  }

  $("#totpSetupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#setupError").textContent = "";
    const { ok, data } = await api("/auth/totp/enable", {
      method: "POST",
      body: JSON.stringify({ preauth: state.preauth, code: $("#setupCode").value }),
    });
    if (!ok) { $("#setupError").textContent = data.error || "Verification failed."; return; }
    await refreshSession();
    setView("app");
  });

  // ---------- 2FA verify (login) ----------
  $("#totpVerifyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#verifyError").textContent = "";
    const { ok, data } = await api("/auth/totp/verify", {
      method: "POST",
      body: JSON.stringify({ preauth: state.preauth, code: $("#verifyCode").value }),
    });
    if (!ok) { $("#verifyError").textContent = data.error || "Verification failed."; return; }
    await refreshSession();
    setView("app");
  });

  // ---------- Search ----------
  document.querySelectorAll("#modeToggle .mode").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeToggle .mode").forEach((m) => m.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.searchMode = btn.getAttribute("data-mode");
      if (state.lastQuery) runSearch(state.lastQuery);
    })
  );

  document.querySelectorAll("#exampleChips .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $("#query").value = chip.getAttribute("data-q");
      runSearch(chip.getAttribute("data-q"));
    })
  );

  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch($("#query").value.trim());
  });

  function card(item, rank) {
    return `<div class="card">
      <div class="card-top">
        <p class="card-title"><span class="rank">${rank}.</span>${escapeHtml(item.title)}</p>
        <span class="card-score">${item.score}</span>
      </div>
      <p class="card-meta">${escapeHtml(item.brand)} · ${escapeHtml(item.category)} · <span class="card-price">$${item.price}</span></p>
      <p class="card-desc">${escapeHtml(item.description)}</p>
    </div>`;
  }

  function column(title, cls, items) {
    const body = items.length
      ? items.map((it, i) => card(it, i + 1)).join("")
      : `<p class="no-results">No results.</p>`;
    return `<div class="result-col">
      <h4><span class="dot ${cls}"></span>${title}</h4>${body}</div>`;
  }

  async function runSearch(q) {
    q = (q || "").trim();
    state.lastQuery = q;
    const results = $("#results");
    const empty = $("#emptyState");
    if (!q) { results.innerHTML = ""; results.className = "results"; empty.classList.remove("hidden"); return; }
    empty.classList.add("hidden");
    results.innerHTML = `<p class="no-results">Searching…</p>`;

    if (state.searchMode === "compare") {
      const { ok, data } = await api(`/search/compare?q=${encodeURIComponent(q)}`);
      if (!ok) return handleSearchError(data);
      setEmbedBadge(data.embed_mode);
      results.className = "results compare";
      results.innerHTML =
        column("Keyword · BM25", "keyword", data.keyword) +
        column("Semantic", "semantic", data.semantic) +
        column("Hybrid · RRF", "hybrid", data.hybrid);
    } else {
      const { ok, data } = await api(`/search/${state.searchMode}?q=${encodeURIComponent(q)}`);
      if (!ok) return handleSearchError(data);
      setEmbedBadge(data.embed_mode);
      results.className = "results";
      const label = state.searchMode[0].toUpperCase() + state.searchMode.slice(1);
      results.innerHTML = column(label, state.searchMode, data.results);
    }
  }

  function handleSearchError(data) {
    if (data && data.error === "authentication required") { refreshSession(); setView("auth"); return; }
    $("#results").innerHTML = `<p class="no-results">Search failed. Please try again.</p>`;
  }

  function setEmbedBadge(mode) {
    if (!mode) { $("#embedBadge").textContent = ""; return; }
    const dense = mode.startsWith("dense");
    $("#embedBadge").innerHTML = dense
      ? `embeddings: <b>${escapeHtml(mode.replace("dense:", ""))}</b>`
      : `embeddings: <b>lexical fallback</b> (install sentence-transformers for dense vectors)`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Boot ----------
  (async () => {
    const email = await refreshSession();
    // Returning from Google OAuth lands on /#app
    if (location.hash.startsWith("#app") && email) setView("app");
    else if (location.hash.startsWith("#error")) { setView("auth"); $("#authError").textContent = "Google sign-in failed. Please try again."; }
  })();
})();
