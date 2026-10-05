/* ============================================================
   Verdant — shared behaviour

   The static build kept a cart in localStorage. Here the cart is
   Shopify's, so every mutation goes through the Cart AJAX API and the
   markup is re-rendered by the Section Rendering API rather than being
   rebuilt in JavaScript. That keeps prices, discounts and currency
   formatting authoritative on Shopify's side.
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.VerdantSettings || {};
  var ROUTES = CFG.routes || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ---------- money ----------
     Mirrors Shopify's money filter for the four standard formats. */
  function formatMoney(cents, format) {
    if (typeof cents === "string") cents = cents.replace(".", "");
    var fmt = format || CFG.moneyFormat || "${{amount}}";
    var placeholder = /\{\{\s*(\w+)\s*\}\}/;

    function thousands(num, precision, thousandSep, decimalSep) {
      if (isNaN(num) || num === null) return "0";
      num = (num / 100).toFixed(precision);
      var parts = num.split(".");
      var head = parts[0].replace(/(\d)(?=(\d\d)+\d$)/g, "$1" + (thousandSep || ","));
      var tail = parts[1] ? (decimalSep || ".") + parts[1] : "";
      return head + tail;
    }

    var value = "";
    var match = fmt.match(placeholder);
    switch (match && match[1]) {
      case "amount":                              value = thousands(cents, 2); break;
      case "amount_no_decimals":                  value = thousands(cents, 0); break;
      case "amount_with_comma_separator":         value = thousands(cents, 2, ".", ","); break;
      case "amount_no_decimals_with_comma_separator": value = thousands(cents, 0, ".", ","); break;
      case "amount_with_space_separator":         value = thousands(cents, 2, " ", ","); break;
      case "amount_no_decimals_with_space_separator": value = thousands(cents, 0, " ", ","); break;
      default:                                    value = thousands(cents, 2);
    }
    return fmt.replace(placeholder, value);
  }
  window.formatMoney = formatMoney;

  /* ---------- toast ---------- */
  var toast = document.querySelector(".toast");
  var toastMsg = toast && toast.querySelector("span");
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.setAttribute("data-on", "1");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.setAttribute("data-on", "0"); }, 3200);
  }
  window.showToast = showToast;

  /* ---------- cart ---------- */
  function paintCount(count) {
    Array.prototype.forEach.call(document.querySelectorAll(".cart-pip"), function (p) {
      p.setAttribute("data-n", String(count));
      p.textContent = count;
    });
  }

  /* Which sections need re-rendering depends on the page we are on. */
  function sectionsToRender() {
    var ids = [];
    var cartSection = document.getElementById("main-cart");
    if (cartSection) ids.push(cartSection.dataset.sectionId);
    var headerCount = document.querySelector("[data-cart-count-section]");
    if (headerCount) ids.push(headerCount.dataset.cartCountSection);
    return ids.filter(Boolean).join(",");
  }

  function applySections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      var html = new DOMParser().parseFromString(sections[id], "text/html");
      var incoming = html.querySelector('[data-section-id="' + id + '"]');
      var current = document.querySelector('[data-section-id="' + id + '"]');
      if (incoming && current) current.innerHTML = incoming.innerHTML;
    });
  }

  function cartRequest(url, body) {
    var sections = sectionsToRender();
    if (sections) body.sections = sections;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.description || data.message || CFG.strings.error);
        return data;
      });
    });
  }

  function refreshCount() {
    return fetch(ROUTES.cart + ".js", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (cart) { paintCount(cart.item_count); return cart; })
      .catch(function () {});
  }

  /* Add to cart — delegated so dynamically rendered cards work too. */
  document.addEventListener("submit", function (e) {
    var form = e.target.closest("form[data-product-form]");
    if (!form || CFG.cartAjax === false) return;
    e.preventDefault();

    var btn = form.querySelector("[data-add-button]");
    var label = btn && btn.querySelector("[data-label]");
    var prev = label && label.textContent;
    if (btn && btn.hasAttribute("aria-busy")) return;
    if (btn) btn.setAttribute("aria-busy", "true");

    var body = {};
    new FormData(form).forEach(function (v, k) { body[k] = v; });

    cartRequest(ROUTES.cartAdd, body)
      .then(function (data) {
        if (label) { label.textContent = CFG.strings.added; btn.setAttribute("data-done", "1"); }
        showToast((data.product_title || data.title || "") + " " + CFG.strings.added.toLowerCase());
        applySections(data.sections);
        return refreshCount();
      })
      .catch(function (err) { showToast(err.message); })
      .finally(function () {
        setTimeout(function () {
          if (label && prev) label.textContent = prev;
          if (btn) { btn.removeAttribute("data-done"); btn.removeAttribute("aria-busy"); }
        }, 1700);
      });
  });

  /* Cart line quantity + remove */
  document.addEventListener("click", function (e) {
    var ctl = e.target.closest("[data-line-change]");
    if (!ctl) return;
    e.preventDefault();
    var line = parseInt(ctl.dataset.line, 10);
    var qty = parseInt(ctl.dataset.lineChange, 10);
    ctl.setAttribute("aria-busy", "true");
    cartRequest(ROUTES.cartChange, { line: line, quantity: qty })
      .then(function (data) {
        applySections(data.sections);
        paintCount(data.item_count);
        if (qty === 0) showToast(CFG.strings.removed);
        if (data.item_count === 0) window.location.reload();
      })
      .catch(function (err) { showToast(err.message); });
  });

  /* ---------- quantity steppers ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-step]");
    if (!b) return;
    var box = b.closest(".qty");
    var out = box.querySelector("input, span, output");
    var cur = parseInt(out.value !== undefined ? out.value : out.textContent, 10) || 1;
    var next = Math.min(99, Math.max(1, cur + parseInt(b.dataset.step, 10)));
    if (out.value !== undefined) { out.value = next; } else { out.textContent = next; }
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });

  /* ---------- free shipping meter ---------- */
  function paintShipping(totalCents) {
    var meter = document.querySelector("[data-ship-meter]");
    if (!meter) return;
    var threshold = (CFG.freeShippingThreshold || 0) * 100;
    if (!threshold) { meter.hidden = true; return; }
    var gap = threshold - totalCents;
    var msg = meter.querySelector("[data-ship-msg]");
    var bar = meter.querySelector("[data-ship-bar]");
    if (gap > 0) {
      msg.textContent = meter.dataset.awayText.replace("[amount]", formatMoney(gap));
      bar.style.setProperty("--v", Math.min(100, (totalCents / threshold) * 100).toFixed(1) + "%");
    } else {
      msg.textContent = meter.dataset.unlockedText;
      bar.style.setProperty("--v", "100%");
    }
    meter.hidden = false;
  }
  window.paintShipping = paintShipping;
  var initialTotal = document.querySelector("[data-cart-total]");
  if (initialTotal) paintShipping(parseInt(initialTotal.dataset.cartTotal, 10) || 0);

  /* ---------- theme toggle ---------- */
  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-theme-toggle]")) return;
    var dark = getComputedStyle(root).getPropertyValue("--dark-mode").trim() === "1";
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("verdant.theme", next); } catch (err) {}
  });

  /* ---------- nav shadow ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.setAttribute("data-stuck", (window.scrollY || 0) > 12 ? "1" : "0"); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- reveal on enter ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el, i) {
    el.style.transitionDelay = Math.min(i, 6) * 55 + "ms";
    io.observe(el);
  });

  /* ---------- 3D tilt on product cards ---------- */
  if (!reduced && CFG.motion !== false && window.matchMedia("(pointer:fine)").matches) {
    Array.prototype.forEach.call(document.querySelectorAll(".tea"), function (card) {
      var inner = card.querySelector(".tea__in");
      if (!inner) return;
      card.addEventListener("mousemove", function (ev) {
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5;
        var py = (ev.clientY - r.top) / r.height - 0.5;
        inner.style.transform = "rotateY(" + px * 12 + "deg) rotateX(" + py * -12 + "deg) translateZ(12px)";
      });
      card.addEventListener("mouseleave", function () { inner.style.transform = ""; });
    });
  }

  /* ---------- product page: variant switching ---------- */
  var variantRoot = document.querySelector("[data-variant-picker]");
  if (variantRoot) {
    var productJson = document.getElementById("ProductJson");
    var product = productJson ? JSON.parse(productJson.textContent) : null;
    variantRoot.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-variant-id]");
      if (!opt || !product) return;
      var id = parseInt(opt.dataset.variantId, 10);
      var variant = product.variants.filter(function (v) { return v.id === id; })[0];
      if (!variant) return;

      Array.prototype.forEach.call(variantRoot.querySelectorAll("[data-variant-id]"), function (x) {
        x.setAttribute("aria-pressed", x === opt ? "true" : "false");
      });

      var idInput = document.querySelector("[data-variant-input]");
      if (idInput) idInput.value = variant.id;

      var priceEl = document.querySelector("[data-price]");
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      var cmpEl = document.querySelector("[data-compare]");
      if (cmpEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          cmpEl.textContent = formatMoney(variant.compare_at_price);
          cmpEl.hidden = false;
        } else { cmpEl.hidden = true; }
      }
      var stickyPrice = document.querySelector("[data-sticky-price]");
      if (stickyPrice) stickyPrice.textContent = variant.title + " · " + formatMoney(variant.price);

      var btn = document.querySelector("[data-add-button]");
      var lbl = btn && btn.querySelector("[data-label]");
      if (btn) {
        btn.disabled = !variant.available;
        if (lbl) lbl.textContent = variant.available ? btn.dataset.addText : btn.dataset.soldText;
      }
      if (history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set("variant", variant.id);
        history.replaceState({}, "", url);
      }
    });
  }

  /* ---------- sticky buy bar ---------- */
  var buyBlock = document.querySelector("[data-buy-block]");
  var sticky = document.querySelector("[data-sticky-buy]");
  if (buyBlock && sticky) {
    new IntersectionObserver(function (en) {
      sticky.setAttribute("data-on", en[0].isIntersecting ? "0" : "1");
    }, { rootMargin: "-80px 0px 0px 0px" }).observe(buyBlock);
  }

  /* ---------- collection filter chips ---------- */
  var chips = document.querySelector("[data-filter-chips]");
  if (chips) {
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (!b) return;
      Array.prototype.forEach.call(chips.querySelectorAll("[data-filter]"), function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      var f = b.dataset.filter;
      var shown = 0;
      Array.prototype.forEach.call(document.querySelectorAll("[data-product-type]"), function (card) {
        var on = f === "all" || card.dataset.productType === f;
        card.hidden = !on;
        if (on) shown++;
      });
      var count = document.querySelector("[data-filter-count]");
      if (count) count.textContent = count.dataset.template.replace("[count]", shown);
      var empty = document.querySelector("[data-filter-empty]");
      if (empty) empty.hidden = shown > 0;
    });
  }

  paintCount(document.querySelector(".cart-pip") ? parseInt(document.querySelector(".cart-pip").dataset.n, 10) || 0 : 0);
})();
