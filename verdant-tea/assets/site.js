/* ============================================================
   VERDANT — shared behaviour
   Cart lives in localStorage so it survives navigation between pages.
   ============================================================ */
(function(){
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "verdant.cart.v1";

  /* ---------- catalogue (single source of truth) ---------- */
  var CATALOG = {
    "misty-ridge": {name:"Misty Ridge", type:"Green",  price:2400, size:"50 g", garden:"Huangshan"},
    "ember-gold":  {name:"Ember Gold",  type:"Oolong", price:3200, size:"50 g", garden:"Alishan"},
    "deep-forest": {name:"Deep Forest", type:"Pu-erh", price:3900, size:"100 g",garden:"Menghai"},
    "first-light": {name:"First Light", type:"White",  price:2800, size:"25 g", garden:"Fuding"},
    "gaiwan":      {name:"Porcelain Gaiwan", type:"Vessel", price:1900, size:"150 ml", garden:"Jingdezhen"},
    "scoop":       {name:"Bamboo Scoop & Pick", type:"Tool", price:850, size:"Pair", garden:"Anji"},
    "pouch-set":   {name:"Spare Pouches", type:"Refill", price:600, size:"Set of 5", garden:"—"}
  };
  window.VERDANT_CATALOG = CATALOG;

  function read(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch(e){ return {}; }
  }
  function write(c){
    try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){}
    paint();
    document.dispatchEvent(new CustomEvent("cart:change", {detail:c}));
  }
  var Cart = {
    all: read,
    count: function(){ var c = read(), n = 0; for(var k in c) n += c[k]; return n; },
    total: function(){
      var c = read(), t = 0;
      for(var k in c){ if(CATALOG[k]) t += CATALOG[k].price * c[k]; }
      return t;
    },
    add: function(id, qty){
      if(!CATALOG[id]) return;
      var c = read(); c[id] = (c[id] || 0) + (qty || 1); write(c);
    },
    set: function(id, qty){
      var c = read();
      if(qty <= 0){ delete c[id]; } else { c[id] = qty; }
      write(c);
    },
    remove: function(id){ var c = read(); delete c[id]; write(c); }
  };
  window.Cart = Cart;

  function paint(){
    var n = Cart.count();
    Array.prototype.forEach.call(document.querySelectorAll(".cart-pip"), function(p){
      p.setAttribute("data-n", String(n));
      p.textContent = n;
    });
  }

  /* ---------- money ---------- */
  function money(p){ return "₹" + p.toLocaleString("en-IN"); }
  window.money = money;

  /* ---------- theme ---------- */
  try{
    var saved = localStorage.getItem("verdant.theme");
    if(saved) root.setAttribute("data-theme", saved);
  }catch(e){}
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-theme-toggle]");
    if(!b) return;
    var dark = getComputedStyle(root).getPropertyValue("--dark-mode").trim() === "1";
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try{ localStorage.setItem("verdant.theme", next); }catch(err){}
  });

  /* ---------- nav shadow ---------- */
  var nav = document.querySelector(".nav");
  if(nav){
    var onScroll = function(){ nav.setAttribute("data-stuck", (window.scrollY || 0) > 12 ? "1" : "0"); };
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();
  }

  /* ---------- reveal ---------- */
  var io = new IntersectionObserver(function(en){
    en.forEach(function(x){
      if(x.isIntersecting){ x.target.classList.add("in"); io.unobserve(x.target); }
    });
  }, {rootMargin:"0px 0px -10% 0px"});
  Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function(el, i){
    el.style.transitionDelay = (Math.min(i, 6) * 55) + "ms";
    io.observe(el);
  });

  /* ---------- toast ---------- */
  var toast = document.querySelector(".toast"), toastMsg, tid;
  if(toast) toastMsg = toast.querySelector("span");
  window.showToast = function(msg){
    if(!toast) return;
    toastMsg.textContent = msg;
    toast.setAttribute("data-on", "1");
    clearTimeout(tid);
    tid = setTimeout(function(){ toast.setAttribute("data-on", "0"); }, 3200);
  };

  /* ---------- add to cart (delegated) ---------- */
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-add]");
    if(!b) return;
    var id = b.getAttribute("data-add");
    var qtyEl = document.querySelector('[data-qty-for="' + id + '"] span');
    var qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
    Cart.add(id, qty);
    var item = CATALOG[id];
    if(b.dataset.busy) return;
    b.dataset.busy = "1";
    var was = b.querySelector("[data-label]") || b;
    var prev = was.textContent;
    was.textContent = "Added";
    b.setAttribute("data-done", "1");
    window.showToast(item.name + " · " + item.size + " added to your order");
    setTimeout(function(){
      was.textContent = prev;
      b.removeAttribute("data-done");
      delete b.dataset.busy;
    }, 1700);
  });

  /* ---------- qty steppers ---------- */
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-step]");
    if(!b) return;
    var box = b.closest(".qty");
    var out = box.querySelector("span");
    var v = parseInt(out.textContent, 10) + parseInt(b.getAttribute("data-step"), 10);
    if(v < 1) v = 1;
    if(v > 99) v = 99;
    out.textContent = v;
    var forId = box.getAttribute("data-qty-for");
    if(box.hasAttribute("data-live") && forId){ Cart.set(forId, v); }
  });

  /* ---------- 3D tilt on product cards ---------- */
  if(!reduced && window.matchMedia("(pointer:fine)").matches){
    Array.prototype.forEach.call(document.querySelectorAll(".tea"), function(card){
      var inner = card.querySelector(".tea__in");
      if(!inner) return;
      card.addEventListener("mousemove", function(ev){
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - .5;
        var py = (ev.clientY - r.top) / r.height - .5;
        inner.style.transform = "rotateY(" + (px * 12) + "deg) rotateX(" + (py * -12) + "deg) translateZ(12px)";
      });
      card.addEventListener("mouseleave", function(){ inner.style.transform = ""; });
    });
  }

  paint();
  document.addEventListener("DOMContentLoaded", paint);
})();
