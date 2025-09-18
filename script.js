// ====== CONFIG ======
const API_BASE = "http://127.0.0.1:8000/api";
const STORAGE_KEY = "cart_bowls";

// ====== UTIL ======
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const money = (n) => `$${Number(n).toFixed(0)}`;

function toast(msg){
  // avisito simple
  console.log(msg);
}

// ====== CARRITO (estado en localStorage) ======
let cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); // {id: { id,name,price,img,qty }}

function saveCart(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function cartTotals(){
  let qty = 0, sum = 0;
  Object.values(cart).forEach(it => { qty += it.qty; sum += it.qty * Number(it.price); });
  $("#cart-count") && ($("#cart-count").textContent = qty);
  $("#cart-subtotal") && ($("#cart-subtotal").textContent = money(sum));
}

function renderCart(){
  const $wrap = $("#cart-items");
  if(!$wrap) return;

  if(Object.keys(cart).length === 0){
    $wrap.innerHTML = `<p class="cart-empty">Tu carrito está vacío.</p>`;
    cartTotals();
    return;
  }

  const html = Object.values(cart).map(it => `
    <div class="cart-item" data-id="${it.id}">
      <img src="${it.img || ""}" alt="${it.name}">
      <div>
        <h4>${it.name}</h4>
        <div class="price">${money(it.price)} c/u
          <button class="remove-btn" data-action="remove" aria-label="Quitar">Quitar</button>
        </div>
      </div>
      <div class="qtty">
        <button class="qbtn" data-action="dec" aria-label="Restar">−</button>
        <span>${it.qty}</span>
        <button class="qbtn" data-action="inc" aria-label="Sumar">+</button>
      </div>
    </div>
  `).join("");

  $wrap.innerHTML = html;
  cartTotals();
}

function addToCart({id, name, price, img}){
  if(!cart[id]) cart[id] = { id, name, price: Number(price), img: img || "", qty: 0 };
  cart[id].qty++;
  saveCart();
  renderCart();
  // abre el drawer al agregar (si existe)
  const toggle = $("#cart-toggle");
  if(toggle) toggle.checked = true;
}

// Controles del carrito (sumar/restar/quitar)
document.addEventListener("click", (e)=>{
  const act = e.target.dataset.action;
  const item = e.target.closest(".cart-item");
  if(!act || !item) return;
  const id = item.dataset.id;
  if(act === "inc") cart[id].qty++;
  if(act === "dec") cart[id].qty = Math.max(0, cart[id].qty - 1);
  if(act === "remove") delete cart[id];
  if(cart[id] && cart[id].qty === 0) delete cart[id];
  saveCart(); renderCart();
});

// ====== UI: pintar cards de bowls ======
function cardHTML(b){
  // Estructura compatible con tu CSS actual
  // Nota: si no usas imágenes públicas, usa rutas relativas (ej: img/bowls/coco.jpeg)
  const accentClass = b.slug === "coco" ? "coco" : b.slug === "frutos-rojos" ? "berries" : b.slug === "chocolate-fit" ? "choco" : "";
  return `
  <article class="card ${accentClass}">
    <div class="card__media">
      <span class="badge">${b.badge || b.name}</span>
      <img src="${b.image_url || ""}" alt="${b.name}">
    </div>
    <div class="card__body">
      <h3 class="card__title">${b.name}</h3>
      <p class="card__desc">${b.description || ""}</p>
      <div class="tags">
        ${(b.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="card__footer">
        <span class="price">${money(b.price)}</span>
        <button class="btn add-to-cart"
          data-id="${b.slug || b.id}"
          data-name="${b.name}"
          data-price="${b.price}"
          data-img="${b.image_url || ""}"
          aria-label="Agregar ${b.name} al carrito">Agregar</button>
      </div>
    </div>
  </article>`;
}

// Escucha clic en botones Agregar
document.addEventListener("click", (e)=>{
  const btn = e.target.closest(".add-to-cart");
  if(!btn) return;
  addToCart({
    id: btn.dataset.id,
    name: btn.dataset.name,
    price: btn.dataset.price,
    img: btn.dataset.img
  });
});

// ====== CARGA DE BOWLS ======
async function getBowlsFromAPI(){
  const url = `${API_BASE}/bowls/`;
  const r = await fetch(url);
  if(!r.ok) throw new Error(`API bowls HTTP ${r.status}`);
  return await r.json();
}

// Fallback local si la API no responde (para que la UI no se quede en blanco)
function localSeed(){
  return [
    {
      id: 1, slug: "coco", name: "Coco Tropical",
      description: "Base cremosa de coco, plátano y piña; granola y coco tostado.",
      price: 95,
      image_url: "img/bowls/coco.jpeg",
      tags: ["sin azúcar", "vegano", "alto en fibra"],
      badge: "Coco"
    },
    {
      id: 2, slug: "frutos-rojos", name: "Berry Boost",
      description: "Fresas, frambuesas y arándanos sobre base de frutos rojos.",
      price: 99,
      image_url: "img/bowls/frutos-rojos.jpeg",
      tags: ["antioxidante", "natural", "sin gluten"],
      badge: "Frutos rojos"
    },
    {
      id: 3, slug: "chocolate-fit", name: "Choco Power",
      description: "Cacao puro, plátano y proteína; almendras y mantequilla de maní.",
      price: 105,
      image_url: "img/bowls/chocolate-fit.jpeg",
      tags: ["alto en proteína", "energía"],
      badge: "Chocolate fit"
    }
  ];
}

async function loadBowls(){
  const $menu = document.querySelector("main.menu");
  if(!$menu){ console.warn("No encontré <main class='menu'>"); return; }

  try{
    const bowls = await getBowlsFromAPI();
    if(!Array.isArray(bowls)) throw new Error("Respuesta inesperada");
    $menu.innerHTML = bowls.map(cardHTML).join("");
    toast("Bowls cargados desde API");
  }catch(err){
    console.warn("Fallo API, usando seed local:", err);
    const bowls = localSeed();
    $menu.innerHTML = bowls.map(cardHTML).join("");
    // Nota: para que las imágenes locales funcionen, guarda los .jpeg en /img/bowls/ junto al HTML.
  }
}

// ====== CHECKOUT: envía orden a Django ======
async function checkout(){
  const items = Object.values(cart).map(it => ({
    bowl: null,                     // podrías mandar el ID real si lo tienes
    name: it.name,
    price: Number(it.price),
    quantity: it.qty,
    image_url: it.img || ""
  }));
  if(items.length === 0){
    alert("Tu carrito está vacío."); return;
  }

  const payload = {
    customer_name: "",              // si usas formulario, reemplaza
    customer_phone: "",
    items
  };

  try{
    const r = await fetch(`${API_BASE}/orders/`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    if(!r.ok){
      const txt = await r.text();
      throw new Error(`Error ${r.status}: ${txt}`);
    }
    const order = await r.json();
    // Limpia carrito
    cart = {};
    saveCart(); renderCart();
    alert(`¡Orden creada! #${order.id} Total: ${money(order.total)}`);
  }catch(err){
    console.error(err);
    alert("No se pudo crear la orden. Revisa que el servidor Django esté arriba y CORS habilitado.");
  }
}

// Hook del botón Finalizar compra
document.addEventListener("click", (e)=>{
  if(e.target.closest(".checkout")) checkout();
});

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  loadBowls();
});
